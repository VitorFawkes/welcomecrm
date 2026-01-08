import { useState, useEffect, useCallback, useMemo } from 'react'
import { AlertTriangle, Check, Loader2, Tag, Plane, FileCheck } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import { cn } from '../../lib/utils'
import { usePipelinePhases } from '../../hooks/usePipelinePhases'
import { usePipelineStages } from '../../hooks/usePipelineStages'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import { SystemPhase } from '../../types/pipeline'
import UniversalFieldRenderer from '../fields/UniversalFieldRenderer'

type Card = Database['public']['Tables']['cards']['Row'] & {
    briefing_inicial?: any | null
}


interface ObservacoesEstruturadasProps {
    card: Card
}

type ViewMode = string

const EMPTY_OBJECT = {}

export default function ObservacoesEstruturadas({ card }: ObservacoesEstruturadasProps) {
    const queryClient = useQueryClient()
    const { data: phases } = usePipelinePhases()
    const { data: stages } = usePipelineStages()

    // Data Sources
    const productData = useMemo(() => (card.produto_data as any) || EMPTY_OBJECT, [card.produto_data])
    const briefingData = useMemo(() => (card.briefing_inicial as any) || EMPTY_OBJECT, [card.briefing_inicial])

    // State
    const [viewMode, setViewMode] = useState<ViewMode>(SystemPhase.SDR)
    const [editedObs, setEditedObs] = useState<any>({})
    const [lastSavedObs, setLastSavedObs] = useState<any>({})
    const [isDirty, setIsDirty] = useState(false)

    // Determine the relevant stage ID for the current viewMode
    const viewModeStageId = useMemo(() => {
        if (!phases || !stages) return card.pipeline_stage_id

        // If viewMode is a specific phase slug, find the corresponding phase
        const currentPhase = phases.find(p => p.slug === viewMode)
        if (!currentPhase) return card.pipeline_stage_id

        // Find stages belonging to this phase (new phase_id linking OR legacy fase string linking)
        const phaseStages = stages.filter(s =>
            s.phase_id === currentPhase.id ||
            (!s.phase_id && s.fase === currentPhase.name)
        )

        if (phaseStages.length > 0) {
            // Return the last stage of the phase (most complete config)
            return phaseStages[phaseStages.length - 1].id
        }

        return card.pipeline_stage_id
    }, [viewMode, phases, stages, card.pipeline_stage_id])

    // Sync ViewMode with Card Stage
    useEffect(() => {
        if (!phases) return

        const currentStage = stages?.find(s => s.id === card.pipeline_stage_id)
        const currentPhase = phases.find(p => p.name === currentStage?.fase)
        let targetMode: string = SystemPhase.SDR

        // Only switch to current phase if it exists, has a slug, AND is visible
        if (currentPhase && currentPhase.slug && currentPhase.visible_in_card !== false) {
            targetMode = currentPhase.slug
        } else {
            // Default to SDR if phase not found or hidden
            const sdrPhase = phases.find(p => p.slug === SystemPhase.SDR)
            if (sdrPhase && sdrPhase.slug) targetMode = sdrPhase.slug
        }

        setViewMode(prev => {
            if (prev !== targetMode) return targetMode
            return prev
        })
        // eslint-disable-next-line react-hooks/set-state-in-effect
    }, [card.pipeline_stage_id, phases, stages])

    // Determine active section key based on viewMode
    // All "Informações Importantes" views use the same section ('observacoes_criticas')
    // Visibility per stage is controlled by stage_field_config, not by different sections
    const activeSectionKey = useMemo(() => {
        switch (viewMode) {
            case SystemPhase.SDR:
            case SystemPhase.PLANNER:
            case SystemPhase.POS_VENDA:
                return 'observacoes_criticas' // Single section for all "Info Importantes"
            default: return viewMode // Dynamic phases use their slug as key
        }
    }, [viewMode])

    // Determine active data source based on viewMode
    const activeData = useMemo(() => {
        switch (viewMode) {
            case SystemPhase.SDR: return briefingData.observacoes || {}
            case SystemPhase.PLANNER: return productData.observacoes_criticas || {}
            case SystemPhase.POS_VENDA: return productData.observacoes_pos_venda || {}
            default: return productData[viewMode] || {} // Dynamic phases stored in product_data[slug]
        }
    }, [viewMode, briefingData, productData])

    // Sync local state when activeData changes
    useEffect(() => {
        setEditedObs(activeData)
        setLastSavedObs(activeData)
        setIsDirty(false)
        // eslint-disable-next-line react-hooks/set-state-in-effect
    }, [activeData])

    // Fetch Field Configs
    const { getVisibleFields, isLoading: loadingConfig } = useFieldConfig()

    // Fetch fields based on active stage and section
    const fields = useMemo(() => {
        const targetStageId = viewModeStageId || card.pipeline_stage_id
        if (!targetStageId) return []

        // For legacy phases, we might still want to filter by section to keep backward compatibility
        // But for dynamic phases, we want ALL visible fields configured in the Matrix
        if (viewMode === SystemPhase.SDR || viewMode === SystemPhase.PLANNER || viewMode === SystemPhase.POS_VENDA) {
            return getVisibleFields(targetStageId, activeSectionKey)
        }

        // Dynamic Phases: Return ALL visible fields for this stage, regardless of section
        return getVisibleFields(targetStageId)
    }, [viewModeStageId, activeSectionKey, getVisibleFields, viewMode, card.pipeline_stage_id])

    // Mutation to save changes
    const updateCard = useMutation({
        mutationFn: async (newData: any) => {
            const { error } = await supabase
                .from('cards')
                .update(newData)
                .eq('id', card.id!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
            setLastSavedObs(editedObs)
            setIsDirty(false)
        }
    })

    const handleSave = async () => {
        if (!isDirty) return

        let updatePayload: any = {}

        if (viewMode === SystemPhase.SDR) {
            updatePayload = {
                briefing_inicial: {
                    ...briefingData,
                    observacoes: editedObs
                }
            }
        } else if (viewMode === SystemPhase.PLANNER) {
            updatePayload = {
                produto_data: {
                    ...productData,
                    observacoes_criticas: editedObs
                }
            }
        } else if (viewMode === SystemPhase.POS_VENDA) {
            updatePayload = {
                produto_data: {
                    ...productData,
                    observacoes_pos_venda: editedObs
                }
            }
        } else {
            // Dynamic Phase
            updatePayload = {
                produto_data: {
                    ...productData,
                    [viewMode]: editedObs
                }
            }
        }

        try {
            await updateCard.mutateAsync(updatePayload)
        } catch (error) {
            console.error('Failed to save observations:', error)
        }
    }

    const handleChange = useCallback((key: string, value: any) => {
        setEditedObs((prev: any) => {
            const next = { ...prev, [key]: value }
            setIsDirty(JSON.stringify(next) !== JSON.stringify(lastSavedObs))
            return next
        })
    }, [lastSavedObs])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
            handleSave()
        }
    }

    const renderFieldInput = (field: any) => {
        const value = editedObs[field.key]

        return (
            <UniversalFieldRenderer
                field={field}
                value={value}
                mode="edit"
                onChange={(val) => handleChange(field.key, val)}
            />
        )
    }

    // Get visible phases for tabs (filter out hidden ones)
    const visibleLegacyPhases = useMemo(() => {
        if (!phases) return { sdr: true, planner: true, posVenda: true }
        const sdrPhase = phases.find(p => p.slug === SystemPhase.SDR)
        const plannerPhase = phases.find(p => p.slug === SystemPhase.PLANNER)
        const posVendaPhase = phases.find(p => p.slug === SystemPhase.POS_VENDA)
        return {
            sdr: sdrPhase?.visible_in_card !== false,
            planner: plannerPhase?.visible_in_card !== false,
            posVenda: posVendaPhase?.visible_in_card !== false
        }
    }, [phases])

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

                    {updateCard.isPending ? (
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
                    ) : updateCard.isSuccess ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            Salvo
                        </div>
                    ) : null}
                </div>

                <div className="flex gap-6 overflow-x-auto pb-1 scrollbar-hide">
                    {/* SDR Tab */}
                    {visibleLegacyPhases.sdr && (
                        <button
                            onClick={() => {
                                if (isDirty) {
                                    if (confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
                                        setViewMode(SystemPhase.SDR)
                                    }
                                } else {
                                    setViewMode(SystemPhase.SDR)
                                }
                            }}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-colors px-1 flex items-center gap-2 whitespace-nowrap",
                                viewMode === SystemPhase.SDR
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            <Tag className="h-4 w-4" />
                            SDR
                        </button>
                    )}

                    {/* Planner Tab */}
                    {visibleLegacyPhases.planner && (
                        <button
                            onClick={() => {
                                if (isDirty) {
                                    if (confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
                                        setViewMode(SystemPhase.PLANNER)
                                    }
                                } else {
                                    setViewMode(SystemPhase.PLANNER)
                                }
                            }}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-colors px-1 flex items-center gap-2 whitespace-nowrap",
                                viewMode === SystemPhase.PLANNER
                                    ? "border-purple-500 text-purple-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            <Plane className="h-4 w-4" />
                            Planner
                        </button>
                    )}

                    {/* Pós-Venda Tab */}
                    {visibleLegacyPhases.posVenda && (
                        <button
                            onClick={() => {
                                if (isDirty) {
                                    if (confirm('Você tem alterações não salvas. Deseja descartá-las?')) {
                                        setViewMode(SystemPhase.POS_VENDA)
                                    }
                                } else {
                                    setViewMode(SystemPhase.POS_VENDA)
                                }
                            }}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-colors px-1 flex items-center gap-2 whitespace-nowrap",
                                viewMode === SystemPhase.POS_VENDA
                                    ? "border-green-500 text-green-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            <FileCheck className="h-4 w-4" />
                            Pós-Venda
                        </button>
                    )}
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
                            Nenhum campo configurado para "Informações Importantes".
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Configure os campos no Painel Admin → Governança de Dados → Seção "Informações Importantes".
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
