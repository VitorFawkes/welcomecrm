import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../database.types'

type Card = Database['public']['Tables']['cards']['Row']

// Unified requirement types
type RequirementType = 'field' | 'proposal' | 'task'

interface BaseRequirement {
    id: string
    requirement_type: RequirementType
    label: string
    stage_id: string
    isBlocking: boolean
    isFuture: boolean
    is_blocking_config: boolean
}

interface FieldRequirement extends BaseRequirement {
    requirement_type: 'field'
    field_key: string
}

interface ProposalRequirement extends BaseRequirement {
    requirement_type: 'proposal'
    proposal_min_status: string
}

interface TaskRequirement extends BaseRequirement {
    requirement_type: 'task'
    task_tipo: string
    task_require_completed: boolean
}

export type Requirement = FieldRequirement | ProposalRequirement | TaskRequirement

// Legacy interface for backward compatibility
export interface LegacyRequirement {
    id: string
    field_key: string
    label: string
    stage_id: string
    isBlocking: boolean
    isFuture: boolean
}

export function useStageRequirements(card: Card) {
    // Fetch proposals for this card (for proposal requirement checking)
    const { data: proposals } = useQuery({
        queryKey: ['card-proposals', card.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('proposals')
                .select('id, status')
                .eq('card_id', card.id)
            return data || []
        },
        enabled: !!card.id,
        staleTime: 1000 * 60 * 2
    })

    // Fetch completed tasks for this card (for task requirement checking)
    const { data: tasks } = useQuery({
        queryKey: ['card-tasks-completed', card.id],
        queryFn: async () => {
            const { data } = await supabase
                .from('tarefas')
                .select('id, tipo, concluida, status')
                .eq('card_id', card.id)
            return data || []
        },
        enabled: !!card.id,
        staleTime: 1000 * 60 * 2
    })

    const { data: requirements, isLoading } = useQuery({
        queryKey: ['stage-requirements', card.pipeline_stage_id],
        queryFn: async () => {
            if (!card.pipeline_stage_id) return []

            // Get current stage info
            const { data: currentStageData, error: stageError } = await supabase
                .from('pipeline_stages')
                .select('pipeline_id, ordem')
                .eq('id', card.pipeline_stage_id)
                .single()

            if (stageError) throw stageError
            const pipelineId = (currentStageData as any).pipeline_id
            const currentOrder = (currentStageData as any).ordem

            // Fetch all required configs for this pipeline
            const { data, error } = await supabase
                .from('stage_field_config')
                .select(`
                    *,
                    pipeline_stages!inner (
                        id,
                        ordem,
                        fase,
                        pipeline_id
                    ),
                    system_fields (
                        label,
                        type
                    )
                `)
                .eq('is_required', true)
                .eq('pipeline_stages.pipeline_id', pipelineId)

            if (error) throw error

            const sortedData = (data || []).sort((a: any, b: any) => {
                return (a.pipeline_stages?.ordem || 0) - (b.pipeline_stages?.ordem || 0)
            })

            return sortedData.map((config: any): Requirement => {
                const baseReq = {
                    id: config.id,
                    stage_id: config.stage_id,
                    isBlocking: config.pipeline_stages.ordem === currentOrder,
                    isFuture: config.pipeline_stages.ordem > currentOrder,
                    is_blocking_config: config.is_blocking ?? true
                }

                const reqType = config.requirement_type || 'field'

                if (reqType === 'proposal') {
                    return {
                        ...baseReq,
                        requirement_type: 'proposal',
                        label: config.requirement_label || 'Proposta',
                        proposal_min_status: config.proposal_min_status
                    } as ProposalRequirement
                }

                if (reqType === 'task') {
                    return {
                        ...baseReq,
                        requirement_type: 'task',
                        label: config.requirement_label || `Tarefa: ${config.task_tipo}`,
                        task_tipo: config.task_tipo,
                        task_require_completed: config.task_require_completed ?? true
                    } as TaskRequirement
                }

                // Default: field type
                return {
                    ...baseReq,
                    requirement_type: 'field',
                    field_key: config.field_key,
                    label: config.system_fields?.label || config.requirement_label || config.field_key
                } as FieldRequirement
            }).filter((req: Requirement) => req.isBlocking || req.isFuture)
        },
        enabled: !!card.pipeline_stage_id,
        staleTime: 1000 * 60 * 5
    })

    // Check if a field requirement is satisfied
    const checkFieldRequirement = (fieldKey: string): boolean => {
        // Check in top level card fields
        if (fieldKey in card && (card as Record<string, unknown>)[fieldKey]) return true

        // Waterfall: Check produto_data FIRST
        if (card.produto_data && typeof card.produto_data === 'object') {
            const produtoData = card.produto_data as Record<string, unknown>
            const value = produtoData[fieldKey]

            if (value !== null && value !== undefined && value !== '') {
                if (Array.isArray(value) && value.length === 0) {
                    // Empty array - continue to check briefing_inicial
                } else if (typeof value === 'object' && Object.keys(value).length === 0) {
                    // Empty object - continue to check briefing_inicial
                } else {
                    return true
                }
            }
        }

        // Waterfall: Also check in briefing_inicial
        if ((card as any).briefing_inicial && typeof (card as any).briefing_inicial === 'object') {
            const briefingData = (card as any).briefing_inicial as Record<string, unknown>
            const value = briefingData[fieldKey]

            if (value === null || value === undefined || value === '') return false
            if (Array.isArray(value) && value.length === 0) return false
            if (typeof value === 'object' && Object.keys(value).length === 0) return false

            return true
        }

        return false
    }

    // Proposal status hierarchy for comparison
    const PROPOSAL_STATUS_ORDER = ['draft', 'sent', 'viewed', 'in_progress', 'accepted']

    // Check if a proposal requirement is satisfied
    const checkProposalRequirement = (minStatus: string): boolean => {
        if (!proposals || proposals.length === 0) return false

        const minIndex = PROPOSAL_STATUS_ORDER.indexOf(minStatus)
        if (minIndex === -1) return false

        return proposals.some(p => {
            const proposalIndex = PROPOSAL_STATUS_ORDER.indexOf(p.status)
            return proposalIndex >= minIndex
        })
    }

    // Check if a task requirement is satisfied
    const checkTaskRequirement = (taskTipo: string, requireCompleted: boolean): boolean => {
        if (!tasks || tasks.length === 0) return false

        return tasks.some(t => {
            if (t.tipo !== taskTipo) return false
            if (requireCompleted && !t.concluida) return false
            return true
        })
    }

    // Unified requirement checker
    const checkRequirement = (req: Requirement): boolean => {
        switch (req.requirement_type) {
            case 'field':
                return checkFieldRequirement(req.field_key)
            case 'proposal':
                return checkProposalRequirement(req.proposal_min_status)
            case 'task':
                return checkTaskRequirement(req.task_tipo, req.task_require_completed)
            default:
                return true
        }
    }

    // Legacy checkRequirement for field_key string (backward compat)
    const checkRequirementLegacy = (fieldKey: string): boolean => {
        return checkFieldRequirement(fieldKey)
    }

    // Filter requirements by type
    const fieldRequirements = requirements?.filter((r): r is FieldRequirement => r.requirement_type === 'field') || []
    const proposalRequirements = requirements?.filter((r): r is ProposalRequirement => r.requirement_type === 'proposal') || []
    const taskRequirements = requirements?.filter((r): r is TaskRequirement => r.requirement_type === 'task') || []

    // Categorize by blocking/future
    const blockingRequirements = requirements?.filter((r: Requirement) => r.isBlocking) || []
    const futureRequirements = requirements?.filter((r: Requirement) => r.isFuture) || []

    // Calculate missing requirements
    const missingBlocking = blockingRequirements.filter(req => !checkRequirement(req))
    const missingFuture = futureRequirements.filter(req => !checkRequirement(req))

    // All requirements complete?
    const allBlockingComplete = missingBlocking.length === 0

    return {
        requirements,
        isLoading,
        // Categorized by type
        fieldRequirements,
        proposalRequirements,
        taskRequirements,
        // Categorized by stage
        blockingRequirements,
        futureRequirements,
        // Missing requirements
        missingBlocking,
        missingFuture,
        allBlockingComplete,
        // Checker functions
        checkRequirement,
        checkRequirementLegacy // Backward compat for field_key string
    }
}
