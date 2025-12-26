import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

export function useStageRequirements(card: Card) {
    const { data: requirements, isLoading } = useQuery({
        queryKey: ['stage-requirements', card.pipeline_stage_id],
        queryFn: async () => {
            if (!card.pipeline_stage_id) return []

            // Fetch ALL required fields for this pipeline
            // We need to join stage_field_config with pipeline_stages to get the order
            // And filter by the pipeline of the current card (via stage)

            // First get the pipeline_id of the current card's stage
            const { data: currentStageData, error: stageError } = await supabase
                .from('pipeline_stages')
                .select('pipeline_id, ordem')
                .eq('id', card.pipeline_stage_id)
                .single()

            if (stageError) throw stageError
            const pipelineId = currentStageData.pipeline_id
            const currentOrder = currentStageData.ordem

            // Now fetch all stage configs for this pipeline where required is true
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
                .eq('required', true)
                .eq('pipeline_stages.pipeline_id', pipelineId)
                .order('pipeline_stages(ordem)', { ascending: true })

            if (error) throw error

            return (data || []).map((config: any) => ({
                field_key: config.field_key,
                label: config.system_fields?.label || config.field_key,
                stage_id: config.stage_id,
                isBlocking: config.pipeline_stages.ordem === currentOrder,
                isFuture: config.pipeline_stages.ordem > currentOrder
            })).filter((req: any) => req.isBlocking || req.isFuture)
        },
        enabled: !!card.pipeline_stage_id,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    const checkRequirement = (fieldKey: string): boolean => {
        // Check in top level card fields
        if (fieldKey in card && (card as any)[fieldKey]) return true

        // Check in produto_data
        if (card.produto_data && typeof card.produto_data === 'object') {
            const produtoData = card.produto_data as any
            const value = produtoData[fieldKey]

            if (value === null || value === undefined || value === '') return false
            if (Array.isArray(value) && value.length === 0) return false
            if (typeof value === 'object' && Object.keys(value).length === 0) return false

            return true
        }

        return false
    }

    const blockingRequirements = requirements?.filter((r: any) => r.isBlocking) || []
    const futureRequirements = requirements?.filter((r: any) => r.isFuture) || []

    const missingBlocking = blockingRequirements.filter(req => !checkRequirement(req.field_key))
    const missingFuture = futureRequirements.filter(req => !checkRequirement(req.field_key))

    return {
        requirements,
        isLoading,
        blockingRequirements,
        futureRequirements,
        missingBlocking,
        missingFuture,
        checkRequirement
    }
}
