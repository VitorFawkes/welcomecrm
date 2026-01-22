/**
 * AutomationRulesPage - Admin UI for configuring task automation rules
 * 
 * Matrix UI Pattern (like ActionRequirementsTab):
 * - Rows = Automation rules (task types with timing)
 * - Columns = Pipeline stages
 * - Toggle = Rule active/inactive for that stage
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import {
    Loader2,
    Plus,
    Trash2,
    Clock,
    Zap,
    Phone,
    Users,
    Mail,
    MessageSquare,
    FileText,
    CheckCircle2,
    Layers,
    Grid,
    CheckSquare,
    Square
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { usePipelinePhases } from '../../../hooks/usePipelinePhases'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

interface AutomationRule {
    id: string
    trigger_stage_id: string
    trigger_type: string
    task_tipo: string
    task_titulo: string
    task_descricao?: string
    task_prioridade: string
    assign_to: string
    timing_type: string
    timing_value: number
    timing_respect_business_hours: boolean
    conditions: Record<string, any>
    is_active: boolean
    order_index: number
}

const TASK_TYPES = [
    { value: 'ligacao', label: 'Ligação', icon: Phone, color: 'blue' },
    { value: 'reuniao', label: 'Reunião', icon: Users, color: 'purple' },
    { value: 'email', label: 'E-mail', icon: Mail, color: 'amber' },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'green' },
    { value: 'enviar_proposta', label: 'Enviar Proposta', icon: FileText, color: 'emerald' },
    { value: 'followup', label: 'Follow-up', icon: Clock, color: 'indigo' },
    { value: 'tarefa', label: 'Tarefa Geral', icon: CheckCircle2, color: 'slate' },
]

const TIMING_OPTIONS = [
    { value: '5', label: '5 minutos', unit: 'relative_minutes' },
    { value: '15', label: '15 minutos', unit: 'relative_minutes' },
    { value: '30', label: '30 minutos', unit: 'relative_minutes' },
    { value: '60', label: '1 hora', unit: 'relative_minutes' },
    { value: '180', label: '3 horas', unit: 'relative_minutes' },
    { value: '24', label: '24 horas', unit: 'relative_hours' },
    { value: '48', label: '48 horas', unit: 'relative_hours' },
    { value: '72', label: '72 horas', unit: 'relative_hours' },
    { value: '7', label: '7 dias', unit: 'relative_days' },
]

const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Baixa' },
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Alta' },
    { value: 'urgent', label: 'Urgente' },
]

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function AutomationRulesPage() {
    const queryClient = useQueryClient()
    const [viewMode, setViewMode] = useState<'macro' | 'matrix'>('macro')
    const [showAddDrawer, setShowAddDrawer] = useState(false)

    // Form state
    const [formTaskTipo, setFormTaskTipo] = useState('ligacao')
    const [formTitulo, setFormTitulo] = useState('')
    const [formTiming, setFormTiming] = useState('60')
    const [formPrioridade, setFormPrioridade] = useState('normal')
    const [formStageId, setFormStageId] = useState('')

    // Fetch phases and stages
    const { data: phasesData } = usePipelinePhases()
    const phases = phasesData || []

    const { data: stages, isLoading: loadingStages } = useQuery({
        queryKey: ['pipeline-stages-automation'],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipeline_stages')
                .select('id, nome, fase, ordem, phase_id')
                .order('ordem')
            return data || []
        }
    })

    // Fetch all automation rules
    const { data: rules, isLoading: loadingRules } = useQuery({
        queryKey: ['automation-rules-all'],
        queryFn: async () => {
            const { data } = await supabase
                .from('automation_rules')
                .select('*')
                .order('order_index')
            return (data || []) as unknown as AutomationRule[]
        }
    })

    const createMutation = useMutation({
        mutationFn: async (rule: Partial<AutomationRule>) => {
            const { error } = await supabase
                .from('automation_rules')
                .insert([rule as any])
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-rules-all'] })
            setShowAddDrawer(false)
            resetForm()
            toast.success('Regra criada!')
        },
        onError: (error: any) => {
            toast.error(`Erro: ${error.message}`)
        }
    })

    // Delete rule mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('automation_rules')
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-rules-all'] })
            toast.success('Regra removida!')
        }
    })

    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
            const { error } = await supabase
                .from('automation_rules')
                .update({ is_active } as any)
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-rules-all'] })
        }
    })

    const resetForm = () => {
        setFormTaskTipo('ligacao')
        setFormTitulo('')
        setFormTiming('60')
        setFormPrioridade('normal')
        setFormStageId('')
    }

    const handleCreateRule = () => {
        if (!formStageId || !formTitulo.trim()) {
            toast.error('Preencha todos os campos obrigatórios')
            return
        }

        const timingOption = TIMING_OPTIONS.find(t => t.value === formTiming)

        createMutation.mutate({
            trigger_stage_id: formStageId,
            trigger_type: 'stage_enter',
            task_tipo: formTaskTipo,
            task_titulo: formTitulo,
            task_prioridade: formPrioridade,
            timing_type: timingOption?.unit || 'relative_minutes',
            timing_value: parseInt(formTiming),
            assign_to: 'card_owner',
            is_active: true,
            conditions: { require_no_pending_task_of_type: formTaskTipo }
        })
    }

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
        const isHex = color?.startsWith('#') || color?.startsWith('rgb')
        if (isHex) {
            return { header: { backgroundColor: `${color}1A`, borderTopColor: color }, text: { color } }
        }
        const baseColor = color?.replace('bg-', '') || 'gray-500'
        return { headerClass: `${color}/10`, textClass: `text-${baseColor}` }
    }

    // Group rules by task type for display
    const rulesByTaskType = useMemo(() => {
        const grouped: Record<string, AutomationRule[]> = {}
        TASK_TYPES.forEach(t => { grouped[t.value] = [] })
        rules?.forEach(rule => {
            if (grouped[rule.task_tipo]) {
                grouped[rule.task_tipo].push(rule)
            }
        })
        return grouped
    }, [rules])

    // Get rule for a specific stage and task type
    const getRuleForStage = (stageId: string, taskTipo: string) => {
        return rules?.find(r => r.trigger_stage_id === stageId && r.task_tipo === taskTipo)
    }

    if (loadingStages || loadingRules) {
        return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex-none flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg">
                            <Zap className="w-6 h-6 text-amber-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-foreground">Automações</h2>
                    </div>
                    <p className="text-muted-foreground">Crie tarefas automaticamente quando cards mudam de etapa.</p>
                </div>
                <div className="flex items-center gap-3">
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
                            Por Fase
                        </button>
                        <button
                            onClick={() => setViewMode('matrix')}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                                viewMode === 'matrix' ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Grid className="w-4 h-4" />
                            Matriz
                        </button>
                    </div>
                    <Button onClick={() => setShowAddDrawer(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Nova Regra
                    </Button>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="flex-1 bg-card rounded-xl border border-border shadow-sm overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="sticky left-0 top-0 z-30 bg-muted border-b border-r border-border p-4 min-w-[200px] text-left">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tipo de Tarefa</span>
                            </th>
                            {viewMode === 'macro' ? (
                                phases.map(phase => {
                                    const styles = getPhaseStyles(phase.color)
                                    return (
                                        <th
                                            key={phase.id}
                                            className={cn("sticky top-0 z-20 border-b border-border p-3 min-w-[160px] text-center bg-muted", (styles as any).headerClass)}
                                            style={(styles as any).header}
                                        >
                                            <span className={cn("text-xs font-bold uppercase", (styles as any).textClass)} style={(styles as any).text}>
                                                {phase.label}
                                            </span>
                                        </th>
                                    )
                                })
                            ) : (
                                sortedStages.map(stage => (
                                    <th key={stage.id} className="sticky top-0 z-20 bg-muted border-b border-border p-2 min-w-[120px] text-center">
                                        <span className="text-xs font-bold text-muted-foreground uppercase">{stage.nome}</span>
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {TASK_TYPES.map(taskType => {
                            const TaskIcon = taskType.icon
                            const rulesForType = rulesByTaskType[taskType.value] || []

                            return (
                                <tr key={taskType.value} className="group hover:bg-muted/50 transition-colors">
                                    <td className="sticky left-0 z-10 bg-card group-hover:bg-muted border-r border-border px-4 py-3 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-1.5 rounded-md", `bg-${taskType.color}-100`)}>
                                                <TaskIcon className={cn("w-4 h-4", `text-${taskType.color}-600`)} />
                                            </div>
                                            <div>
                                                <span className="font-medium text-foreground text-sm">{taskType.label}</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({rulesForType.length} regras)
                                                </span>
                                            </div>
                                        </div>
                                    </td>

                                    {viewMode === 'macro' ? (
                                        phases.map(phase => {
                                            const phaseStages = stages?.filter(s =>
                                                s.phase_id === phase.id || (!s.phase_id && s.fase === phase.name)
                                            ) || []
                                            const activeCount = phaseStages.filter(s =>
                                                getRuleForStage(s.id, taskType.value)?.is_active
                                            ).length
                                            const state = activeCount === phaseStages.length ? 'all' : activeCount > 0 ? 'some' : 'none'

                                            return (
                                                <td key={phase.id} className="px-2 py-3 text-center border-r border-border last:border-r-0">
                                                    <div className={cn(
                                                        "inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all",
                                                        state === 'all' ? `bg-${taskType.color}-500/20 text-${taskType.color}-600 ring-1 ring-${taskType.color}-500/30` :
                                                            state === 'some' ? `bg-${taskType.color}-500/10 text-${taskType.color}-600/70` :
                                                                "bg-transparent text-muted-foreground"
                                                    )}>
                                                        {state === 'some' ? <div className="font-bold text-xs">-</div> :
                                                            state === 'all' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                                    </div>
                                                </td>
                                            )
                                        })
                                    ) : (
                                        sortedStages.map(stage => {
                                            const rule = getRuleForStage(stage.id, taskType.value)
                                            const isActive = rule?.is_active

                                            return (
                                                <td key={stage.id} className="px-2 py-3 text-center border-r border-border last:border-r-0">
                                                    {rule ? (
                                                        <button
                                                            onClick={() => toggleMutation.mutate({ id: rule.id, is_active: !isActive })}
                                                            className={cn(
                                                                "p-2 rounded-lg transition-all mx-auto flex items-center justify-center",
                                                                isActive
                                                                    ? `bg-${taskType.color}-500/20 text-${taskType.color}-600 ring-1 ring-${taskType.color}-500/30`
                                                                    : "bg-muted text-muted-foreground line-through opacity-50"
                                                            )}
                                                            title={isActive ? `${rule.timing_value}min` : 'Desativado'}
                                                        >
                                                            <CheckSquare className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => {
                                                                setFormStageId(stage.id)
                                                                setFormTaskTipo(taskType.value)
                                                                setFormTitulo(`${taskType.label} automática`)
                                                                setShowAddDrawer(true)
                                                            }}
                                                            className="p-2 rounded-lg bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground transition-all mx-auto flex items-center justify-center"
                                                            title="Adicionar regra"
                                                        >
                                                            <Square className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            )
                                        })
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Rules List (Below Matrix) */}
            {rules && rules.length > 0 && (
                <div className="mt-6 bg-card rounded-xl border border-border shadow-sm p-4">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Regras Ativas ({rules.filter(r => r.is_active).length})</h3>
                    <div className="space-y-2">
                        {rules.filter(r => r.is_active).map(rule => {
                            const taskType = TASK_TYPES.find(t => t.value === rule.task_tipo)
                            const stage = stages?.find(s => s.id === rule.trigger_stage_id)
                            const TaskIcon = taskType?.icon || CheckCircle2

                            return (
                                <div key={rule.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <TaskIcon className={cn("w-4 h-4", `text-${taskType?.color || 'gray'}-600`)} />
                                        <div>
                                            <span className="font-medium text-sm">{rule.task_titulo}</span>
                                            <span className="text-xs text-muted-foreground ml-2">
                                                → {stage?.nome} • em {rule.timing_value} {rule.timing_type.replace('relative_', '')}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteMutation.mutate(rule.id)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Add Rule Drawer */}
            {showAddDrawer && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-6">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Nova Regra de Automação
                        </h3>

                        <div className="space-y-4">
                            {/* Stage Selector */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Quando entrar em</label>
                                <Select
                                    value={formStageId}
                                    onChange={setFormStageId}
                                    options={sortedStages.map(s => ({ value: s.id, label: `${s.nome} (${s.fase})` }))}
                                    placeholder="Selecione a etapa..."
                                />
                            </div>

                            {/* Task Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Criar tarefa de</label>
                                <Select
                                    value={formTaskTipo}
                                    onChange={setFormTaskTipo}
                                    options={TASK_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                />
                            </div>

                            {/* Task Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título da Tarefa</label>
                                <Input
                                    value={formTitulo}
                                    onChange={(e) => setFormTitulo(e.target.value)}
                                    placeholder="Ex: Ligar para o cliente"
                                />
                            </div>

                            {/* Timing */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento</label>
                                <Select
                                    value={formTiming}
                                    onChange={setFormTiming}
                                    options={TIMING_OPTIONS.map(t => ({ value: t.value, label: t.label }))}
                                />
                            </div>

                            {/* Priority */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
                                <Select
                                    value={formPrioridade}
                                    onChange={setFormPrioridade}
                                    options={PRIORITY_OPTIONS}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => { setShowAddDrawer(false); resetForm() }}>
                                Cancelar
                            </Button>
                            <Button onClick={handleCreateRule} disabled={createMutation.isPending}>
                                {createMutation.isPending ? 'Criando...' : 'Criar Regra'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
