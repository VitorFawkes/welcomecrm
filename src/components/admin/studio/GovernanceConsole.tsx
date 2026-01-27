import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
    Loader2,
    FileText,
    CheckCircle2,
    AlertCircle,
    Plus,
    Trash2,
    ArrowRight,
    LayoutList,
    ShieldAlert
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePipelinePhases } from '../../../hooks/usePipelinePhases'
import { Button } from '../../ui/Button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
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



// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function GovernanceConsole() {
    const queryClient = useQueryClient()
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null)

    // 1. Fetch Phases & Stages
    const { data: phasesData } = usePipelinePhases()
    const phases = phasesData || []

    const { data: stages, isLoading: loadingStages } = useQuery({
        queryKey: ['pipeline-stages-governance'],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipeline_stages')
                .select('id, nome, fase, ordem, phase_id')
                .order('ordem')
            return data || []
        }
    })

    // 2. Fetch All Requirements
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

    // 3. Fetch Dynamic Task Types (The "Elite" Upgrade)
    const { data: taskTypes } = useQuery({
        queryKey: ['task-types-distinct'],
        queryFn: async () => {
            const { data } = await supabase
                .from('task_type_outcomes')
                .select('tipo, outcome_label')
            // Distinct types

            // Deduplicate by type on client side since distinct on select might be tricky with outcome_label
            const uniqueTypes = new Map<string, string>()
            data?.forEach((item: any) => {
                // Use a nice label if available, or capitalize type
                if (!uniqueTypes.has(item.tipo)) {
                    uniqueTypes.set(item.tipo, item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1))
                }
            })

            // Add known types if missing (fallback)
            const defaults = ['ligacao', 'reuniao', 'email', 'whatsapp', 'cobranca', 'handover']
            defaults.forEach(t => {
                if (!uniqueTypes.has(t)) uniqueTypes.set(t, t.charAt(0).toUpperCase() + t.slice(1))
            })

            return Array.from(uniqueTypes.entries()).map(([tipo, label]) => ({ tipo, label }))
        }
    })

    // 4. Fetch Active Workflows (Context)
    const { data: activeWorkflows } = useQuery({
        queryKey: ['active-workflows-context'],
        queryFn: async () => {
            const { data } = await supabase
                .from('workflows')
                .select('id, name, trigger_config, is_active')
                .eq('is_active', true)
            return data || []
        }
    })

    // Mutations
    const insertMutation = useMutation({
        mutationFn: async (req: ActionRequirement) => {
            const { error } = await supabase.from('stage_field_config').insert([req])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['action-requirements-all'] })
            toast.success('Regra adicionada com sucesso')
        },
        onError: (err: any) => toast.error(`Erro: ${err.message}`)
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('stage_field_config').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['action-requirements-all'] })
            toast.success('Regra removida')
        }
    })

    // Derived State
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

    const selectedStage = stages?.find(s => s.id === selectedStageId)
    const stageRules = requirements?.filter(r => r.stage_id === selectedStageId) || []
    const stageWorkflows = activeWorkflows?.filter(w => (w.trigger_config as any)?.stage_id === selectedStageId) || []

    // Helper to add rule
    const handleAddRule = (type: string, value: string) => {
        if (!selectedStageId) return

        const label = type === 'proposal'
            ? `Proposta ${value}`
            : taskTypes?.find(t => t.tipo === value)?.label || value

        const newReq: ActionRequirement = {
            stage_id: selectedStageId,
            requirement_type: type as 'proposal' | 'task',
            requirement_label: label,
            is_required: true,
            is_blocking: true,
            ...(type === 'proposal' && { proposal_min_status: value }),
            ...(type === 'task' && { task_tipo: value, task_require_completed: true })
        }
        insertMutation.mutate(newReq)
    }

    if (loadingStages || loadingReqs) {
        return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
    }

    return (
        <div className="flex h-[calc(100vh-12rem)] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* LEFT: Stage Navigation */}
            <div className="w-1/3 min-w-[300px] border-r border-gray-200 overflow-y-auto bg-gray-50/50">
                <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <LayoutList className="w-4 h-4 text-gray-500" />
                        Etapas do Pipeline
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">Selecione uma etapa para gerenciar regras.</p>
                </div>
                <div className="p-2 space-y-1">
                    {sortedStages.map(stage => {
                        const ruleCount = requirements?.filter(r => r.stage_id === stage.id).length || 0
                        const isActive = selectedStageId === stage.id
                        const phase = phases.find(p => p.id === stage.phase_id) || phases.find(p => p.name === stage.fase)

                        return (
                            <button
                                key={stage.id}
                                onClick={() => setSelectedStageId(stage.id)}
                                className={cn(
                                    "w-full text-left px-4 py-3 rounded-lg text-sm transition-all flex items-center justify-between group",
                                    isActive
                                        ? "bg-white shadow-sm ring-1 ring-gray-200"
                                        : "hover:bg-gray-100/80 text-gray-600"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={cn("w-2 h-2 rounded-full", isActive ? "ring-2 ring-offset-1 ring-gray-300" : "")}
                                        style={{ backgroundColor: phase?.color || '#ccc' }}
                                    />
                                    <span className={cn("font-medium", isActive ? "text-gray-900" : "text-gray-600")}>
                                        {stage.nome}
                                    </span>
                                </div>
                                {ruleCount > 0 && (
                                    <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                        {ruleCount}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* RIGHT: Detail View */}
            <div className="flex-1 overflow-y-auto bg-white">
                {selectedStage ? (
                    <div className="p-8 max-w-3xl mx-auto">
                        {/* Header */}
                        <div className="mb-8">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                <span className="uppercase tracking-wider font-semibold text-[10px]">Governança da Etapa</span>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedStage.nome}</h2>
                            <p className="text-gray-500">
                                Defina o que é obrigatório para um card sair desta etapa.
                            </p>
                        </div>

                        {/* Context: Active Workflows */}
                        <div className="mb-8 bg-blue-50/50 border border-blue-100 rounded-xl p-5">
                            <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                <ActivityIcon className="w-4 h-4" />
                                Automações Ativas (Contexto)
                            </h4>
                            {stageWorkflows.length > 0 ? (
                                <div className="space-y-2">
                                    {stageWorkflows.map(w => (
                                        <div key={w.id} className="flex items-center gap-2 text-sm text-blue-700 bg-white/60 px-3 py-2 rounded-lg border border-blue-100/50">
                                            <ArrowRight className="w-3 h-3" />
                                            {w.name}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-blue-400 italic">Nenhum workflow automático configurado para iniciar nesta etapa.</p>
                            )}
                        </div>

                        {/* Rules List */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <ShieldAlert className="w-5 h-5 text-gray-400" />
                                    Regras de Bloqueio (Gates)
                                </h3>

                                {/* Add Rule Dropdown */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="h-9 text-xs font-medium bg-gray-900 text-white border-0 hover:bg-gray-800 transition-colors"
                                        >
                                            <Plus className="w-3 h-3 mr-2" />
                                            Adicionar Regra
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[200px]">
                                        <DropdownMenuLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tarefas</DropdownMenuLabel>
                                        {taskTypes?.map(t => (
                                            <DropdownMenuItem
                                                key={t.tipo}
                                                onSelect={() => handleAddRule('task', t.tipo)}
                                                className="cursor-pointer"
                                            >
                                                Exigir {t.label}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Propostas</DropdownMenuLabel>
                                        <DropdownMenuItem onSelect={() => handleAddRule('proposal', 'sent')} className="cursor-pointer">Exigir Proposta Enviada</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleAddRule('proposal', 'viewed')} className="cursor-pointer">Exigir Proposta Visualizada</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleAddRule('proposal', 'accepted')} className="cursor-pointer">Exigir Proposta Aceita</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {stageRules.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                                    <ShieldAlert className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500 font-medium">Nenhuma regra ativa</p>
                                    <p className="text-sm text-gray-400">O card pode sair desta etapa livremente.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {stageRules.map(rule => (
                                        <div key={rule.id} className="group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-gray-300 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "p-2 rounded-lg",
                                                    rule.requirement_type === 'task' ? "bg-purple-50 text-purple-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {rule.requirement_type === 'task' ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <h4 className="font-medium text-gray-900">{rule.requirement_label}</h4>
                                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                                        {rule.is_blocking ? (
                                                            <span className="text-red-600 font-medium flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" />
                                                                Bloqueia Avanço
                                                            </span>
                                                        ) : "Apenas Aviso"}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => rule.id && deleteMutation.mutate(rule.id)}
                                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                        <LayoutList className="w-12 h-12 mb-4 opacity-20" />
                        <p>Selecione uma etapa ao lado para começar</p>
                    </div>
                )}
            </div>
        </div>
    )
}

function ActivityIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
