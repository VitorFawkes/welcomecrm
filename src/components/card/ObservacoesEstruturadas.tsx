import { useState, useEffect, useCallback, useMemo } from 'react'
import { AlertTriangle, Check, Loader2, Tag, Plane, FileCheck } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import { cn } from '../../lib/utils'
import { usePipelinePhases } from '../../hooks/usePipelinePhases'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import { SystemPhase } from '../../types/pipeline'

type Card = Database['public']['Views']['view_cards_acoes']['Row'] & {
    briefing_inicial?: any | null
}


interface ObservacoesEstruturadasProps {
    card: Card
}

type ViewMode = 'SDR' | 'PLANNER' | 'POS_VENDA' | 'MARKETING'

const EMPTY_OBJECT = {}

export default function ObservacoesEstruturadas({ card }: ObservacoesEstruturadasProps) {
    const queryClient = useQueryClient()
    const { data: phases } = usePipelinePhases()

    // Data Sources
    const productData = useMemo(() => (card.produto_data as any) || EMPTY_OBJECT, [card.produto_data])
    const briefingData = useMemo(() => (card.briefing_inicial as any) || EMPTY_OBJECT, [card.briefing_inicial])

    // State
    const [viewMode, setViewMode] = useState<ViewMode>('SDR')
    const [editedObs, setEditedObs] = useState<any>({})
    const [lastSavedObs, setLastSavedObs] = useState<any>({})
    const [isDirty, setIsDirty] = useState(false)

    // Sync ViewMode with Card Stage
    useEffect(() => {
        if (!phases) return

        const sdrPhase = phases.find(p => p.slug === SystemPhase.SDR)
        const plannerPhase = phases.find(p => p.slug === SystemPhase.PLANNER)
        const posVendaPhase = phases.find(p => p.slug === SystemPhase.POS_VENDA)

        if (sdrPhase && card.fase === sdrPhase.name) setViewMode('SDR')
        else if (plannerPhase && card.fase === plannerPhase.name) setViewMode('PLANNER')
        else if (posVendaPhase && card.fase === posVendaPhase.name) setViewMode('POS_VENDA')
        else setViewMode('SDR') // Default
    }, [card.fase, phases])

    // Determine active section key based on viewMode
    const activeSectionKey = useMemo(() => {
        switch (viewMode) {
            case 'SDR': return 'observacoes_sdr'
            case 'PLANNER': return 'observacoes_criticas'
            case 'POS_VENDA': return 'observacoes_pos_venda'
            default: return 'observacoes_criticas'
        }
    }, [viewMode])

    // Determine active data source based on viewMode
    const activeData = useMemo(() => {
        switch (viewMode) {
            case 'SDR': return briefingData.observacoes || {}
            case 'PLANNER': return productData.observacoes_criticas || {}
            case 'POS_VENDA': return productData.observacoes_pos_venda || {}
            default: return {}
        }
    }, [viewMode, briefingData, productData])

    // Sync local state when activeData changes
    useEffect(() => {
        setEditedObs(activeData)
        setLastSavedObs(activeData)
        setIsDirty(false)
    }, [activeData])

    // Fetch Field Configs
    const { getVisibleFields, isLoading: loadingConfig } = useFieldConfig()

    // Get visible fields for the active section and current stage
    const fields = useMemo(() => {
        if (!card.pipeline_stage_id) return []
        return getVisibleFields(card.pipeline_stage_id, activeSectionKey)
    }, [card.pipeline_stage_id, activeSectionKey, getVisibleFields])

    const updateObsMutation = useMutation({
        mutationFn: async (newObs: any) => {
            let updates: any = {}

            if (viewMode === 'SDR') {
                updates = {
                    briefing_inicial: {
                        ...briefingData,
                        observacoes: newObs
                    }
                }
            } else if (viewMode === 'PLANNER') {
                updates = {
                    produto_data: {
                        ...productData,
                        observacoes_criticas: newObs
                    }
                }
            } else if (viewMode === 'POS_VENDA') {
                updates = {
                    produto_data: {
                        ...productData,
                        observacoes_pos_venda: newObs
                    }
                }
            }

            const { error } = await (supabase.from('cards') as any)
                .update(updates)
                .eq('id', card.id)

            if (error) throw error
        },
        onSuccess: (_, newObs) => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id!] })
            setLastSavedObs(newObs)
            setIsDirty(false)
        }
    })

    const handleSave = useCallback(() => {
        updateObsMutation.mutate(editedObs)
    }, [editedObs, updateObsMutation])

    const handleChange = (fieldKey: string, value: any) => {
        const newObs = { ...editedObs, [fieldKey]: value }
        setEditedObs(newObs)
        setIsDirty(JSON.stringify(newObs) !== JSON.stringify(lastSavedObs))
    }

    // Handle Enter to save (Shift+Enter for new line)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const target = e.target as HTMLElement
            if (target.tagName !== 'TEXTAREA') {
                e.preventDefault()
                handleSave()
            }
        }
    }

    const renderFieldInput = (field: { key: string; label: string; type: string; options?: any }) => {
        const value = editedObs[field.key] || ''
        const options = (field.options as any[]) || []

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-gray-50/50 focus:bg-white min-h-[80px]"
                        placeholder={field.label}
                    />
                )
            case 'select':
                return (
                    <select
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                        <option value="">Selecione...</option>
                        {options.map((opt: any, idx: number) => (
                            <option key={idx} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )
            case 'boolean':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleChange(field.key, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{value ? 'Sim' : 'Não'}</span>
                    </div>
                )
            default: // text, number, currency, etc.
                return (
                    <input
                        type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-gray-50/50 focus:bg-white"
                        placeholder={field.label}
                    />
                )
        }
    }

    return (
        <div className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
            {/* Header & Tabs */}
            <div className="border-b border-gray-200 bg-gray-50/50 px-4 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-red-100 rounded-lg">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">Informações Importantes</h3>
                    </div>

                    {updateObsMutation.isPending ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Salvando...
                        </div>
                    ) : isDirty ? (
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                        >
                            <Check className="h-3 w-3" />
                            Salvar Alterações
                        </button>
                    ) : updateObsMutation.isSuccess ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            Salvo
                        </div>
                    ) : null}
                </div>

                <div className="flex gap-6">
                    {[
                        { id: 'SDR', label: 'SDR', color: 'border-blue-500 text-blue-600', icon: Tag },
                        { id: 'PLANNER', label: 'Planner', color: 'border-purple-500 text-purple-600', icon: Plane },
                        { id: 'POS_VENDA', label: 'Pós-Venda', color: 'border-green-500 text-green-600', icon: FileCheck },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (isDirty) {
                                    if (confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
                                        setViewMode(tab.id as ViewMode)
                                    }
                                } else {
                                    setViewMode(tab.id as ViewMode)
                                }
                            }}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-colors px-1 flex items-center gap-2",
                                viewMode === tab.id
                                    ? tab.color
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="p-4" onKeyDown={handleKeyDown}>
                {loadingConfig ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : fields.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-500 italic">
                            Nenhum campo configurado para esta seção ({activeSectionKey}).
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Configure os campos no Painel Admin.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {fields.map((field) => (
                            <div key={field.key}>
                                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                                    <div className={cn("w-1.5 h-1.5 rounded-full",
                                        field.key === 'o_que_e_importante' ? "bg-red-500" :
                                            field.key === 'o_que_nao_pode_dar_errado' ? "bg-orange-500" :
                                                field.key === 'sensibilidades' ? "bg-yellow-500" : "bg-gray-400"
                                    )} />
                                    {field.label}
                                </label>
                                {renderFieldInput(field)}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
