import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Save, Loader2, LayoutTemplate, List, Check, Zap } from 'lucide-react'
import AutomationSettings from './AutomationSettings'

type PipelinePhase = 'SDR' | 'Planner' | 'Pós-venda'
type SettingsTab = 'fields' | 'automation'

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
    { id: 'taxa_planejamento', label: 'Taxa de Planejamento' }
]

export default function PipelineSettings() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('fields')
    const [activePhase, setActivePhase] = useState<PipelinePhase>('SDR')
    const queryClient = useQueryClient()
    const [isSaving, setIsSaving] = useState(false)

    // Fetch settings
    const { data: settings, isLoading } = useQuery({
        queryKey: ['pipeline-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_card_settings')
                .select('*')
                .is('usuario_id', null) // Fetch global defaults for now

            if (error) throw error
            return data
        }
    })

    // Local state for editing
    const [localConfig, setLocalConfig] = useState<any>(null)

    useEffect(() => {
        if (settings) {
            const phaseSettings = settings.find(s => s.fase === activePhase)
            if (phaseSettings) {
                setLocalConfig(phaseSettings)
            } else {
                // Default if not found
                setLocalConfig({
                    fase: activePhase,
                    campos_visiveis: [],
                    campos_kanban: [],
                    ordem_campos: [],
                    ordem_kanban: []
                })
            }
        }
    }, [settings, activePhase])

    const handleToggleField = (fieldId: string, type: 'detail' | 'kanban') => {
        if (!localConfig) return

        const key = type === 'detail' ? 'campos_visiveis' : 'campos_kanban'
        const orderKey = type === 'detail' ? 'ordem_campos' : 'ordem_kanban'

        const currentFields = (localConfig[key] as string[]) || []
        const currentOrder = (localConfig[orderKey] as string[]) || []

        let newFields: string[]
        let newOrder: string[]

        if (currentFields.includes(fieldId)) {
            newFields = currentFields.filter(f => f !== fieldId)
            newOrder = currentOrder.filter(f => f !== fieldId)
        } else {
            newFields = [...currentFields, fieldId]
            newOrder = [...currentOrder, fieldId]
        }

        setLocalConfig({
            ...localConfig,
            [key]: newFields,
            [orderKey]: newOrder
        })
    }

    const saveMutation = useMutation({
        mutationFn: async (newConfig: any) => {
            // Upsert based on fase and usuario_id (null for global)
            const { error } = await supabase
                .from('pipeline_card_settings')
                .upsert({
                    fase: activePhase,
                    campos_visiveis: newConfig.campos_visiveis,
                    ordem_campos: newConfig.ordem_campos,
                    campos_kanban: newConfig.campos_kanban,
                    ordem_kanban: newConfig.ordem_kanban,
                    usuario_id: null // Explicitly setting null for global default
                }, { onConflict: 'fase, usuario_id' })

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-settings'] })
        }
    })

    const handleSave = async () => {
        if (!localConfig) return
        setIsSaving(true)
        try {
            await saveMutation.mutateAsync(localConfig)
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) return <div className="p-8 text-center">Carregando configurações...</div>

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Configuração do Pipeline</h1>
                    <p className="text-gray-500 mt-1">Personalize campos, automações e regras do seu pipeline.</p>
                </div>
                {activeTab === 'fields' && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Salvar Alterações
                    </button>
                )}
            </div>

            {/* Main Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-lg w-fit mb-8">
                <button
                    onClick={() => setActiveTab('fields')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'fields'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
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
                    Automação e Obrigações
                </button>
            </div>

            {activeTab === 'automation' ? (
                <AutomationSettings />
            ) : (
                <>
                    {/* Phase Tabs */}
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
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localConfig?.campos_kanban?.includes(field.id)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-300 bg-white group-hover:border-blue-400'
                                                }`}>
                                                {localConfig?.campos_kanban?.includes(field.id) && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={localConfig?.campos_kanban?.includes(field.id) || false}
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
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${localConfig?.campos_visiveis?.includes(field.id)
                                                ? 'bg-blue-600 border-blue-600 text-white'
                                                : 'border-gray-300 bg-white group-hover:border-blue-400'
                                                }`}>
                                                {localConfig?.campos_visiveis?.includes(field.id) && <Check className="w-3.5 h-3.5" />}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={localConfig?.campos_visiveis?.includes(field.id) || false}
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
        </div>
    )
}
