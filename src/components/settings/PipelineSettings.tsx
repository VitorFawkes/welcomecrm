import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Save, Loader2, LayoutTemplate, List, Check, Zap, Clock, AlertCircle, Shield } from 'lucide-react'
import AutomationSettings from './AutomationSettings'
import type { Database } from '../../database.types'
import StageTransitionsSettings from './StageTransitionsSettings'

type PipelinePhase = 'SDR' | 'Planner' | 'Pós-venda'
type SettingsTab = 'fields' | 'stages' | 'automation' | 'transitions'

interface FieldConfig {
    id: string
    label: string
}

const AVAILABLE_FIELDS: FieldConfig[] = [
    // Meta/Actionable Fields
    { id: 'data_viagem_inicio', label: 'Data da Viagem' },
    { id: 'valor_estimado', label: 'Valor Estimado' },
    { id: 'prioridade', label: 'Prioridade' },
    { id: 'proxima_tarefa', label: 'Próxima Tarefa' },
    { id: 'ultima_interacao', label: 'Última Interação' },
    { id: 'created_at', label: 'Data de Criação' },
    { id: 'updated_at', label: 'Última Atualização' },

    // Product Data Fields
    { id: 'destinos', label: 'Destinos' },
    { id: 'epoca_viagem', label: 'Época da Viagem (Detalhe)' },
    { id: 'pessoas', label: 'Viajantes (Pessoas)' },
    { id: 'orcamento', label: 'Orçamento (Detalhe)' },
    { id: 'motivo', label: 'Motivo da Viagem' },
    { id: 'taxa_planejamento', label: 'Taxa de Planejamento' },

    // New fields for validation
    { id: 'origem', label: 'Origem do Lead' },
    { id: 'external_id', label: 'ID Externo' },
    { id: 'campaign_id', label: 'ID Campanha' }
]

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row'] & {
    stage_fields_settings?: Database['public']['Tables']['stage_fields_settings']['Row'][]
}

export default function PipelineSettings() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('stages')
    const [activePhase, setActivePhase] = useState<PipelinePhase>('SDR')
    const queryClient = useQueryClient()
    const [isSaving, setIsSaving] = useState(false)

    // Fetch settings (View Config)
    const { data: viewSettings } = useQuery({
        queryKey: ['pipeline-settings'],
        queryFn: async () => {
            const { data, error } = await (supabase.from('pipeline_card_settings') as any)
                .select('*')
                .is('usuario_id', null) // Fetch global defaults for now

            if (error) throw error
            return data as any[]
        }
    })

    // Fetch Stages with Settings
    const { data: stages, isLoading: isLoadingStages } = useQuery({
        queryKey: ['pipeline-stages-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('*, stage_fields_settings(*)')
                .order('ordem')

            if (error) throw error
            return data as PipelineStage[]
        }
    })

    // Local state for editing View Config
    const [localViewConfig, setLocalViewConfig] = useState<any>(null)

    // Local state for editing Stages
    const [localStages, setLocalStages] = useState<PipelineStage[]>([])

    useEffect(() => {
        if (viewSettings) {
            const phaseSettings = viewSettings.find(s => s.fase === activePhase)
            if (phaseSettings) {
                setLocalViewConfig(phaseSettings)
            } else {
                setLocalViewConfig({
                    fase: activePhase,
                    campos_visiveis: [],
                    campos_kanban: [],
                    ordem_campos: [],
                    ordem_kanban: []
                })
            }
        }
    }, [viewSettings, activePhase])

    useEffect(() => {
        if (stages) {
            setLocalStages(stages)
        }
    }, [stages])

    const handleToggleField = (fieldId: string, type: 'detail' | 'kanban') => {
        if (!localViewConfig) return

        const key = type === 'detail' ? 'campos_visiveis' : 'campos_kanban'
        const orderKey = type === 'detail' ? 'ordem_campos' : 'ordem_kanban'

        const currentFields = (localViewConfig[key] as string[]) || []
        const currentOrder = (localViewConfig[orderKey] as string[]) || []

        let newFields: string[]
        let newOrder: string[]

        if (currentFields.includes(fieldId)) {
            newFields = currentFields.filter(f => f !== fieldId)
            newOrder = currentOrder.filter(f => f !== fieldId)
        } else {
            newFields = [...currentFields, fieldId]
            newOrder = [...currentOrder, fieldId]
        }

        setLocalViewConfig({
            ...localViewConfig,
            [key]: newFields,
            [orderKey]: newOrder
        })
    }

    const saveViewConfigMutation = useMutation({
        mutationFn: async (newConfig: any) => {
            const { error } = await (supabase.from('pipeline_card_settings') as any)
                .upsert({
                    fase: activePhase,
                    campos_visiveis: newConfig.campos_visiveis,
                    ordem_campos: newConfig.ordem_campos,
                    campos_kanban: newConfig.campos_kanban,
                    ordem_kanban: newConfig.ordem_kanban,
                    usuario_id: null
                }, { onConflict: 'fase, usuario_id' })

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-settings'] })
        }
    })

    const saveStageMutation = useMutation({
        mutationFn: async (stage: PipelineStage) => {
            // Update Stage
            const { error: stageError } = await supabase
                .from('pipeline_stages')
                .update({
                    sla_hours: stage.sla_hours,
                    description: stage.description,
                    nome: stage.nome
                })
                .eq('id', stage.id)

            if (stageError) throw stageError
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-stages-admin'] })
            alert('Etapa salva com sucesso!')
        }
    })

    const toggleRequiredFieldMutation = useMutation({
        mutationFn: async ({ stageId, fieldKey, required, label }: { stageId: string, fieldKey: string, required: boolean, label: string }) => {
            const { error } = await supabase
                .from('stage_fields_settings')
                .upsert({
                    stage_id: stageId,
                    field_key: fieldKey,
                    required: required,
                    label: label
                }, { onConflict: 'stage_id, field_key' })

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-stages-admin'] })
        }
    })

    const handleSaveView = async () => {
        if (!localViewConfig) return
        setIsSaving(true)
        try {
            await saveViewConfigMutation.mutateAsync(localViewConfig)
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateStage = (stageId: string, updates: Partial<PipelineStage>) => {
        setLocalStages(prev => prev.map(s => s.id === stageId ? { ...s, ...updates } : s))
    }

    const handleSaveStage = async (stage: PipelineStage) => {
        try {
            await saveStageMutation.mutateAsync(stage)
        } catch (error) {
            console.error(error)
            alert('Erro ao salvar etapa')
        }
    }

    if (isLoadingStages) return <div className="p-8 text-center">Carregando configurações...</div>

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configuração do Pipeline</h1>
                    <p className="text-gray-500 mt-1">Gerencie etapas, SLAs, campos obrigatórios e visualização.</p>
                </div>
                {activeTab === 'fields' && (
                    <button
                        onClick={handleSaveView}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Visualização
                    </button>
                )}
            </div>

            {/* Main Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg w-fit mb-8">
                <button
                    onClick={() => setActiveTab('stages')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'stages'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <List className="w-4 h-4" />
                    Etapas e Regras
                </button>
                <button
                    onClick={() => setActiveTab('fields')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'fields'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <LayoutTemplate className="w-4 h-4" />
                    Campos e Visualização
                </button>
                <button
                    onClick={() => setActiveTab('automation')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'automation'
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Zap className="w-4 h-4" />
                    Automação
                </button>
            </div>

            {activeTab === 'automation' && <AutomationSettings />}

            {activeTab === 'fields' && (
                <>
                    {/* Phase Tabs for View Config */}
                    <div className="flex gap-2 mb-8 border-b">
                        {(['SDR', 'Planner', 'Pós-venda'] as PipelinePhase[]).map(phase => (
                            <button
                                key={phase}
                                onClick={() => setActivePhase(phase)}
                                className={`px-4 py-2 font-medium text-sm transition-colors relative top-[1px] border-b-2 ${activePhase === phase
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {phase}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Kanban Card View Config */}
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
                                <LayoutTemplate className="w-5 h-5 text-gray-500" />
                                <h2 className="font-semibold text-gray-900">Visão do Card (Kanban)</h2>
                            </div>
                            <div className="p-4">
                                <p className="text-sm text-gray-500 mb-4">Selecione os campos para exibição rápida no card.</p>
                                <div className="space-y-2">
                                    {AVAILABLE_FIELDS.map(field => (
                                        <label key={`kanban-${field.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localViewConfig?.campos_kanban?.includes(field.id)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-300 bg-white group-hover:border-blue-400'
                                                }`}>
                                                {localViewConfig?.campos_kanban?.includes(field.id) && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={localViewConfig?.campos_kanban?.includes(field.id) || false}
                                                onChange={() => handleToggleField(field.id, 'kanban')}
                                            />
                                            <span className="text-gray-700">{field.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Detail View Config */}
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b flex items-center gap-2">
                                <List className="w-5 h-5 text-gray-500" />
                                <h2 className="font-semibold text-gray-900">Visão Detalhada</h2>
                            </div>
                            <div className="p-4">
                                <p className="text-sm text-gray-500 mb-4">Selecione os campos disponíveis ao abrir o card.</p>
                                <div className="space-y-2">
                                    {AVAILABLE_FIELDS.map(field => (
                                        <label key={`detail-${field.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer group">
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localViewConfig?.campos_visiveis?.includes(field.id)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-300 bg-white group-hover:border-blue-400'
                                                }`}>
                                                {localViewConfig?.campos_visiveis?.includes(field.id) && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={localViewConfig?.campos_visiveis?.includes(field.id) || false}
                                                onChange={() => handleToggleField(field.id, 'detail')}
                                            />
                                            <span className="text-gray-700">{field.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'stages' && (
                <div className="space-y-6">
                    {localStages.map((stage) => (
                        <div key={stage.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                        {stage.ordem}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{stage.nome}</h3>
                                        <span className="text-xs text-gray-500 uppercase tracking-wider">{stage.fase}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleSaveStage(stage)}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Salvar Etapa
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* SLA & Description */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            SLA (Horas)
                                        </label>
                                        <input
                                            type="number"
                                            value={stage.sla_hours || ''}
                                            onChange={(e) => handleUpdateStage(stage.id, { sla_hours: e.target.value ? parseInt(e.target.value) : null })}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            placeholder="Ex: 24"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Tempo máximo ideal para permanência nesta etapa.</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Descrição / Instruções
                                        </label>
                                        <textarea
                                            value={stage.description || ''}
                                            onChange={(e) => handleUpdateStage(stage.id, { description: e.target.value })}
                                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            rows={3}
                                            placeholder="Instruções para o time sobre o que fazer nesta etapa..."
                                        />
                                    </div>
                                </div>

                                {/* Required Fields */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        Campos Obrigatórios (Quality Gate)
                                    </label>
                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                                        {AVAILABLE_FIELDS.map(field => {
                                            const isRequired = stage.stage_fields_settings?.some(s => s.field_key === field.id && s.required)
                                            return (
                                                <label key={`${stage.id}-${field.id}`} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer border border-transparent hover:border-gray-200">
                                                    <input
                                                        type="checkbox"
                                                        checked={isRequired || false}
                                                        onChange={(e) => toggleRequiredFieldMutation.mutate({
                                                            stageId: stage.id,
                                                            fieldKey: field.id,
                                                            required: e.target.checked,
                                                            label: field.label
                                                        })}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className={`text-sm ${isRequired ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                                                        {field.label}
                                                    </span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === 'transitions' && (
                <StageTransitionsSettings stages={localStages} />
            )}
        </div>
    )
}

