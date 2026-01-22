/**
 * ActionRequirementsTab - Matrix UI for configuring proposal and task requirements per stage
 * 
 * Pattern: Same matrix UX as StudioUnified (Governança de Dados)
 * - Rows = Requirement types (Proposal statuses, Task types)
 * - Columns = Pipeline stages/phases
 * - Toggle = Whether that requirement is active for that stage
 */

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
    Loader2,
    FileText,
    Phone,
    Users,
    Mail,
    MessageSquare,
    Layers,
    Grid,
    CheckSquare,
    Square
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePipelinePhases } from '../../../hooks/usePipelinePhases'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

interface ActionRequirement {
    id?: string
    stage_id: string
    requirement_type: 'proposal' | 'task'
    requirement_label: string
    is_required: boolean
    is_blocking: boolean
    proposal_min_status?: string
    task_tipo?: string
    task_require_completed?: boolean
}

// Requirements to show as rows in the matrix
const PROPOSAL_REQUIREMENTS = [
    { key: 'proposal_sent', label: 'Proposta Enviada', icon: FileText, status: 'sent', color: 'emerald' },
    { key: 'proposal_viewed', label: 'Proposta Visualizada', icon: FileText, status: 'viewed', color: 'emerald' },
    { key: 'proposal_accepted', label: 'Proposta Aceita', icon: FileText, status: 'accepted', color: 'emerald' },
]

const TASK_REQUIREMENTS = [
    { key: 'task_ligacao', label: 'Ligação Feita', icon: Phone, tipo: 'ligacao', color: 'purple' },
    { key: 'task_reuniao', label: 'Reunião Realizada', icon: Users, tipo: 'reuniao', color: 'purple' },
    { key: 'task_email', label: 'E-mail Enviado', icon: Mail, tipo: 'email', color: 'purple' },
    { key: 'task_whatsapp', label: 'WhatsApp Enviado', icon: MessageSquare, tipo: 'whatsapp', color: 'purple' },
    { key: 'task_proposta', label: 'Proposta Enviada (Tarefa)', icon: FileText, tipo: 'enviar_proposta', color: 'purple' },
]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function ActionRequirementsTab() {
    const queryClient = useQueryClient()
    const [viewMode, setViewMode] = useState<'macro' | 'matrix'>('macro')

    // Fetch phases and stages
    const { data: phasesData } = usePipelinePhases()
    const phases = phasesData || []

    const { data: stages, isLoading: loadingStages } = useQuery({
        queryKey: ['pipeline-stages-action-req'],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipeline_stages')
                .select('id, nome, fase, ordem, phase_id')
                .order('ordem')
            return data || []
        }
    })

    // Fetch all action requirements
    const { data: requirements, isLoading: loadingReqs } = useQuery({
        queryKey: ['action-requirements-all'],
        queryFn: async () => {
            const { data } = await supabase
                .from('stage_field_config')
                .select('*')
                .in('requirement_type', ['proposal', 'task'])
            return (data || []) as ActionRequirement[]
        }
    })

    // Local state for optimistic updates
    const [localConfigs, setLocalConfigs] = useState<Record<string, ActionRequirement>>({})

    useEffect(() => {
        if (requirements) {
            const map: Record<string, ActionRequirement> = {}
            requirements.forEach(r => {
                const key = r.requirement_type === 'proposal'
                    ? `${r.stage_id}-proposal-${r.proposal_min_status}`
                    : `${r.stage_id}-task-${r.task_tipo}`
                map[key] = r
            })
            setLocalConfigs(map)
        }
    }, [requirements])

    // Insert mutation (not upsert - we handle existence check in toggle logic)
    const insertMutation = useMutation({
        mutationFn: async (req: ActionRequirement) => {
            const { error } = await supabase
                .from('stage_field_config')
                .insert([req])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['action-requirements-all'] })
        },
        onError: (error: any) => {
            toast.error(`Erro: ${error.message}`)
        }
    })

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('stage_field_config')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['action-requirements-all'] })
        }
    })

    // Sort stages by phase order
    const sortedStages = useMemo(() => {
        if (!stages || !phases.length) return []
        const phaseOrderMap = new Map<string, number>()
        phases.forEach((phase, index) => {
            phaseOrderMap.set(phase.id, phase.order_index ?? index)
            phaseOrderMap.set(phase.name, phase.order_index ?? index)
        })
        return [...stages].sort((a, b) => {
            const aPhaseOrder = phaseOrderMap.get(a.phase_id || '') ?? phaseOrderMap.get(a.fase || '') ?? 999
            const bPhaseOrder = phaseOrderMap.get(b.phase_id || '') ?? phaseOrderMap.get(b.fase || '') ?? 999
            if (aPhaseOrder !== bPhaseOrder) return aPhaseOrder - bPhaseOrder
            return (a.ordem || 0) - (b.ordem || 0)
        })
    }, [stages, phases])

    // Get phase color styles
    const getPhaseStyles = (color: string) => {
        const isHex = color.startsWith('#') || color.startsWith('rgb')
        if (isHex) {
            return { header: { backgroundColor: `${color}1A`, borderTopColor: color }, text: { color } }
        }
        const baseColor = color.replace('bg-', '')
        return { headerClass: `${color}/10`, textClass: `text-${baseColor}` }
    }

    // Check if requirement exists for stage
    const getConfig = (stageId: string, type: 'proposal' | 'task', subKey: string) => {
        const key = `${stageId}-${type}-${subKey}`
        return localConfigs[key]
    }

    // Toggle requirement for a single stage
    const handleToggle = (stageId: string, type: 'proposal' | 'task', subKey: string, label: string) => {
        const key = `${stageId}-${type}-${subKey}`
        const existing = localConfigs[key]

        if (existing?.id) {
            // Delete
            setLocalConfigs(prev => {
                const next = { ...prev }
                delete next[key]
                return next
            })
            deleteMutation.mutate(existing.id)
        } else {
            // Create
            const newReq: ActionRequirement = {
                stage_id: stageId,
                requirement_type: type,
                requirement_label: label,
                is_required: true,
                is_blocking: true,
                ...(type === 'proposal' && { proposal_min_status: subKey }),
                ...(type === 'task' && { task_tipo: subKey, task_require_completed: true })
            }
            setLocalConfigs(prev => ({ ...prev, [key]: newReq }))
            insertMutation.mutate(newReq)
        }
    }

    // Toggle for entire phase (macro mode)
    const handleMacroToggle = (phaseId: string, type: 'proposal' | 'task', subKey: string, label: string) => {
        const phase = phases.find(p => p.id === phaseId)
        const targetStages = stages?.filter(s =>
            s.phase_id === phaseId || (!s.phase_id && phase && s.fase === phase.name)
        ) || []

        if (targetStages.length === 0) return

        // Check if all have it
        const allHave = targetStages.every(s => getConfig(s.id, type, subKey))

        targetStages.forEach(s => {
            const key = `${s.id}-${type}-${subKey}`
            const existing = localConfigs[key]

            if (allHave && existing?.id) {
                // Remove all
                setLocalConfigs(prev => {
                    const next = { ...prev }
                    delete next[key]
                    return next
                })
                deleteMutation.mutate(existing.id)
            } else if (!allHave && !existing) {
                // Add to those missing
                const newReq: ActionRequirement = {
                    stage_id: s.id,
                    requirement_type: type,
                    requirement_label: label,
                    is_required: true,
                    is_blocking: true,
                    ...(type === 'proposal' && { proposal_min_status: subKey }),
                    ...(type === 'task' && { task_tipo: subKey, task_require_completed: true })
                }
                setLocalConfigs(prev => ({ ...prev, [key]: newReq }))
                insertMutation.mutate(newReq)
            }
        })
    }

    // Get macro state (all/some/none)
    const getMacroState = (phaseId: string, type: 'proposal' | 'task', subKey: string) => {
        const phase = phases.find(p => p.id === phaseId)
        const targetStages = stages?.filter(s =>
            s.phase_id === phaseId || (!s.phase_id && phase && s.fase === phase.name)
        ) || []

        if (targetStages.length === 0) return 'none'

        let count = 0
        targetStages.forEach(s => {
            if (getConfig(s.id, type, subKey)) count++
        })

        if (count === targetStages.length) return 'all'
        if (count > 0) return 'some'
        return 'none'
    }

    if (loadingStages || loadingReqs) {
        return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">Requisitos de Ação</h2>
                    <p className="text-muted-foreground mt-1">Configure propostas e tarefas obrigatórias por etapa.</p>
                </div>
                <div className="flex items-center gap-4">
                    {/* View Toggle */}
                    <div className="flex bg-muted p-1 rounded-lg border border-border">
                        <button
                            onClick={() => setViewMode('macro')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                viewMode === 'macro' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Layers className="w-4 h-4" />
                            Visão Macro
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                viewMode === 'matrix' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Grid className="w-4 h-4" />
                            Matriz Detalhada
                        </button>
                    </div>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            {/* Sticky Corner */}
                            <th className="sticky left-0 top-0 z-30 bg-muted border-b border-r border-border p-4 min-w-[250px] text-left">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Requisito de Ação</span>
                            </th>

                            {/* Column Headers */}
                            {viewMode === 'macro' ? (
                                phases.map(phase => {
                                    const styles = getPhaseStyles(phase.color)
                                    return (
                                        <th
                                            key={phase.id}
                                            className={cn("sticky top-0 z-20 border-b border-border p-3 min-w-[160px] text-center bg-muted", (styles as any).headerClass)}
                                            style={(styles as any).header}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <span
                                                    className={cn("text-xs font-bold uppercase", (styles as any).textClass)}
                                                    style={(styles as any).text}
                                                >
                                                    {phase.label}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-normal">
                                                    {stages?.filter(s => s.phase_id === phase.id || (!s.phase_id && s.fase === phase.name)).length} etapas
                                                </span>
                                            </div>
                                        </th>
                                    )
                                })
                            ) : (
                                sortedStages.map(stage => {
                                    const phase = phases.find(p => p.id === stage.phase_id) || phases.find(p => p.name === stage.fase)
                                    const styles = getPhaseStyles(phase?.color || 'bg-gray-500')
                                    return (
                                        <th key={stage.id} className="sticky top-0 z-20 bg-muted border-b border-border p-2 min-w-[120px] text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <div
                                                    className={cn("w-2 h-2 rounded-full mb-1", (styles as any).badgeClass)}
                                                    style={(styles as any).badge}
                                                />
                                                <span className="text-xs font-bold text-muted-foreground uppercase">{stage.nome}</span>
                                            </div>
                                        </th>
                                    )
                                })
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {/* PROPOSAL SECTION */}
                        <tr className="bg-muted/50">
                            <td className="sticky left-0 z-10 bg-muted border-y border-border px-4 py-2">
                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-emerald-100 text-emerald-700">
                                    Propostas
                                </div>
                            </td>
                            <td colSpan={(viewMode === 'macro' ? phases.length : sortedStages.length)} className="border-y border-border"></td>
                        </tr>

                        {PROPOSAL_REQUIREMENTS.map(req => (
                            <tr key={req.key} className="group hover:bg-muted/50 transition-colors">
                                <td className="sticky left-0 z-10 bg-card group-hover:bg-muted border-r border-border px-4 py-3 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded-md bg-emerald-100">
                                            <req.icon className="w-4 h-4 text-emerald-600" />
                                        </div>
                                        <span className="font-medium text-foreground text-sm">{req.label}</span>
                                    </div>
                                </td>

                                {viewMode === 'macro' ? (
                                    phases.map(phase => {
                                        const state = getMacroState(phase.id, 'proposal', req.status)
                                        return (
                                            <td key={phase.id} className="px-2 py-3 text-center border-r border-border last:border-r-0">
                                                <button
                                                    onClick={() => handleMacroToggle(phase.id, 'proposal', req.status, req.label)}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all mx-auto flex items-center justify-center",
                                                        state === 'all' ? "bg-emerald-500/20 text-emerald-600 ring-1 ring-emerald-500/30" :
                                                            state === 'some' ? "bg-emerald-500/10 text-emerald-600/70 ring-1 ring-emerald-500/20" :
                                                                "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    )}
                                                    title={state === 'all' ? 'Ativo em todas etapas' : state === 'some' ? 'Ativo em algumas etapas' : 'Inativo'}
                                                >
                                                    {state === 'some' ? <div className="w-4 h-4 flex items-center justify-center font-bold text-xs">-</div> :
                                                        state === 'all' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        )
                                    })
                                ) : (
                                    sortedStages.map(stage => {
                                        const isActive = !!getConfig(stage.id, 'proposal', req.status)
                                        return (
                                            <td key={stage.id} className="px-2 py-3 text-center border-r border-border last:border-r-0">
                                                <button
                                                    onClick={() => handleToggle(stage.id, 'proposal', req.status, req.label)}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all mx-auto flex items-center justify-center",
                                                        isActive
                                                            ? "bg-emerald-500/20 text-emerald-600 ring-1 ring-emerald-500/30"
                                                            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    )}
                                                    title={isActive ? 'Obrigatório' : 'Não obrigatório'}
                                                >
                                                    {isActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        )
                                    })
                                )}
                            </tr>
                        ))}

                        {/* TASK SECTION */}
                        <tr className="bg-muted/50">
                            <td className="sticky left-0 z-10 bg-muted border-y border-border px-4 py-2">
                                <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-700">
                                    Tarefas Concluídas
                                </div>
                            </td>
                            <td colSpan={(viewMode === 'macro' ? phases.length : sortedStages.length)} className="border-y border-border"></td>
                        </tr>

                        {TASK_REQUIREMENTS.map(req => (
                            <tr key={req.key} className="group hover:bg-muted/50 transition-colors">
                                <td className="sticky left-0 z-10 bg-card group-hover:bg-muted border-r border-border px-4 py-3 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="p-1.5 rounded-md bg-purple-100">
                                            <req.icon className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <span className="font-medium text-foreground text-sm">{req.label}</span>
                                    </div>
                                </td>

                                {viewMode === 'macro' ? (
                                    phases.map(phase => {
                                        const state = getMacroState(phase.id, 'task', req.tipo)
                                        return (
                                            <td key={phase.id} className="px-2 py-3 text-center border-r border-border last:border-r-0">
                                                <button
                                                    onClick={() => handleMacroToggle(phase.id, 'task', req.tipo, req.label)}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all mx-auto flex items-center justify-center",
                                                        state === 'all' ? "bg-purple-500/20 text-purple-600 ring-1 ring-purple-500/30" :
                                                            state === 'some' ? "bg-purple-500/10 text-purple-600/70 ring-1 ring-purple-500/20" :
                                                                "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    )}
                                                    title={state === 'all' ? 'Ativo em todas etapas' : state === 'some' ? 'Ativo em algumas etapas' : 'Inativo'}
                                                >
                                                    {state === 'some' ? <div className="w-4 h-4 flex items-center justify-center font-bold text-xs">-</div> :
                                                        state === 'all' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        )
                                    })
                                ) : (
                                    sortedStages.map(stage => {
                                        const isActive = !!getConfig(stage.id, 'task', req.tipo)
                                        return (
                                            <td key={stage.id} className="px-2 py-3 text-center border-r border-border last:border-r-0">
                                                <button
                                                    onClick={() => handleToggle(stage.id, 'task', req.tipo, req.label)}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all mx-auto flex items-center justify-center",
                                                        isActive
                                                            ? "bg-purple-500/20 text-purple-600 ring-1 ring-purple-500/30"
                                                            : "bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                                                    )}
                                                    title={isActive ? 'Obrigatório' : 'Não obrigatório'}
                                                >
                                                    {isActive ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                </button>
                                            </td>
                                        )
                                    })
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
