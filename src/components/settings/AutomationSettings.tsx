import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Clock, CheckSquare, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { Database } from '../../database.types'

type Stage = Database['public']['Tables']['pipeline_stages']['Row']
type AutomationRule = Database['public']['Tables']['automation_rules']['Row']
type StageObligation = Database['public']['Tables']['stage_obligations']['Row']

export default function AutomationSettings() {
    const queryClient = useQueryClient()
    const [expandedStage, setExpandedStage] = useState<string | null>(null)
    const [isAddingRule, setIsAddingRule] = useState<string | null>(null)
    const [isAddingObligation, setIsAddingObligation] = useState<string | null>(null)

    // Fetch Stages
    const { data: stages, isLoading: loadingStages } = useQuery({
        queryKey: ['pipeline-stages'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('*')
                .order('ordem')
            if (error) throw error
            return data
        }
    })

    // Fetch Rules
    const { data: rules, isLoading: loadingRules } = useQuery({
        queryKey: ['automation-rules'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('automation_rules')
                .select('*')
                .eq('active', true)
            if (error) throw error
            return data
        }
    })

    // Fetch Obligations
    const { data: obligations, isLoading: loadingObligations } = useQuery({
        queryKey: ['stage-obligations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stage_obligations')
                .select('*')
                .eq('active', true)
            if (error) throw error
            return data
        }
    })

    // Mutations
    const createRuleMutation = useMutation({
        mutationFn: async (newRule: any) => {
            const { error } = await supabase.from('automation_rules').insert(newRule)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
            setIsAddingRule(null)
        }
    })

    const deleteRuleMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('automation_rules').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['automation-rules'] })
        }
    })

    const createObligationMutation = useMutation({
        mutationFn: async (newOb: any) => {
            const { error } = await supabase.from('stage_obligations').insert(newOb)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-obligations'] })
            setIsAddingObligation(null)
        }
    })

    const deleteObligationMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('stage_obligations').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-obligations'] })
        }
    })

    if (loadingStages || loadingRules || loadingObligations) {
        return <div className="p-8 text-center text-gray-500">Carregando configurações...</div>
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Automação e Obrigações</h1>
                <p className="text-gray-500 mt-1">Configure tarefas automáticas e checklists obrigatórios para cada etapa do funil.</p>
            </div>

            <div className="space-y-4">
                {stages?.map(stage => {
                    const stageRules = rules?.filter(r => r.stage_id === stage.id) || []
                    const stageObligations = obligations?.filter(o => o.stage_id === stage.id) || []
                    const isExpanded = expandedStage === stage.id

                    return (
                        <div key={stage.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <button
                                onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{stage.nome}</h3>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {stageRules.length} automações • {stageObligations.length} obrigações
                                        </p>
                                    </div>
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="px-6 pb-6 pt-2 space-y-8 border-t bg-gray-50/50">
                                    {/* AUTOMATION RULES */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <Clock className="w-4 h-4" />
                                                Tarefas Automáticas
                                            </h4>
                                            <button
                                                onClick={() => setIsAddingRule(stage.id)}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Adicionar
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {stageRules.map(rule => (
                                                <div key={rule.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 text-sm">
                                                    <div className="flex items-center gap-3">
                                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                                            {rule.delay_minutes === 0 ? 'Imediato' : `+${rule.delay_minutes} min`}
                                                        </span>
                                                        <span className="font-medium text-gray-900">{rule.task_title}</span>
                                                        <span className="text-gray-500 text-xs">({rule.task_type})</span>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                                                        className="text-gray-400 hover:text-red-500 p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {stageRules.length === 0 && !isAddingRule && (
                                                <p className="text-xs text-gray-400 italic">Nenhuma automação configurada.</p>
                                            )}

                                            {isAddingRule === stage.id && (
                                                <NewRuleForm
                                                    stageId={stage.id}
                                                    pipelineId={stage.pipeline_id}
                                                    onCancel={() => setIsAddingRule(null)}
                                                    onSubmit={(data) => createRuleMutation.mutate(data)}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* STAGE OBLIGATIONS */}
                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                <CheckSquare className="w-4 h-4" />
                                                Obrigações (Checklist)
                                            </h4>
                                            <button
                                                onClick={() => setIsAddingObligation(stage.id)}
                                                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                            >
                                                <Plus className="w-3 h-3" /> Adicionar
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            {stageObligations.map(ob => (
                                                <div key={ob.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 text-sm">
                                                    <div className="flex items-center gap-3">
                                                        {ob.type === 'manual_check' ? (
                                                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-medium">Manual</span>
                                                        ) : (
                                                            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-xs font-medium">Campo</span>
                                                        )}
                                                        <span className="font-medium text-gray-900">{ob.title}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => deleteObligationMutation.mutate(ob.id)}
                                                        className="text-gray-400 hover:text-red-500 p-1"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {stageObligations.length === 0 && !isAddingObligation && (
                                                <p className="text-xs text-gray-400 italic">Nenhuma obrigação configurada.</p>
                                            )}

                                            {isAddingObligation === stage.id && (
                                                <NewObligationForm
                                                    stageId={stage.id}
                                                    pipelineId={stage.pipeline_id}
                                                    onCancel={() => setIsAddingObligation(null)}
                                                    onSubmit={(data) => createObligationMutation.mutate(data)}
                                                />
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

function NewRuleForm({ stageId, pipelineId, onCancel, onSubmit }: any) {
    const [formData, setFormData] = useState({
        task_title: '',
        delay_minutes: 0,
        task_type: 'ligacao',
        task_priority: 'media'
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onSubmit({
            stage_id: stageId,
            pipeline_id: pipelineId,
            ...formData,
            active: true
        })
    }

    return (
        <form onSubmit={handleSubmit} className="bg-blue-50 p-3 rounded-lg border border-blue-100 space-y-3">
            <input
                type="text"
                placeholder="Título da Tarefa"
                className="w-full rounded border-gray-300 text-sm"
                value={formData.task_title}
                onChange={e => setFormData({ ...formData, task_title: e.target.value })}
                required
            />
            <div className="flex gap-2">
                <select
                    className="rounded border-gray-300 text-sm flex-1"
                    value={formData.task_type}
                    onChange={e => setFormData({ ...formData, task_type: e.target.value })}
                >
                    <option value="ligacao">Ligação</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="reuniao">Reunião</option>
                    <option value="outro">Outro</option>
                </select>
                <select
                    className="rounded border-gray-300 text-sm flex-1"
                    value={formData.task_priority}
                    onChange={e => setFormData({ ...formData, task_priority: e.target.value })}
                >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                </select>
                <input
                    type="number"
                    placeholder="Minutos Delay"
                    className="rounded border-gray-300 text-sm w-24"
                    value={formData.delay_minutes}
                    onChange={e => setFormData({ ...formData, delay_minutes: parseInt(e.target.value) || 0 })}
                />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Salvar</button>
            </div>
        </form>
    )
}

function NewObligationForm({ stageId, pipelineId, onCancel, onSubmit }: any) {
    const [formData, setFormData] = useState({
        title: '',
        type: 'manual_check',
        field: ''
    })

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        const payload: any = {
            stage_id: stageId,
            pipeline_id: pipelineId,
            title: formData.title,
            type: formData.type,
            active: true
        }

        if (formData.type === 'field_required') {
            payload.config = { field: formData.field }
        }

        onSubmit(payload)
    }

    return (
        <form onSubmit={handleSubmit} className="bg-amber-50 p-3 rounded-lg border border-amber-100 space-y-3">
            <input
                type="text"
                placeholder="Descrição da Obrigação"
                className="w-full rounded border-gray-300 text-sm"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                required
            />
            <div className="flex gap-2">
                <select
                    className="rounded border-gray-300 text-sm flex-1"
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                    <option value="manual_check">Check Manual</option>
                    <option value="field_required">Campo Obrigatório</option>
                </select>
                {formData.type === 'field_required' && (
                    <input
                        type="text"
                        placeholder="Nome do Campo (ex: motivo)"
                        className="rounded border-gray-300 text-sm flex-1"
                        value={formData.field}
                        onChange={e => setFormData({ ...formData, field: e.target.value })}
                        required
                    />
                )}
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="text-xs text-gray-500 hover:text-gray-700">Cancelar</button>
                <button type="submit" className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Salvar</button>
            </div>
        </form>
    )
}
