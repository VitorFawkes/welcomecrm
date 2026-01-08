import React, { useState, useEffect, useMemo } from 'react'
import { MapPin, Tag, X, Check, History, Globe, AlertTriangle, Eraser, Plane, FileCheck, ThumbsUp, Upload } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '../../lib/utils'
import { useStageRequirements } from '../../hooks/useStageRequirements'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import MarketingView from './MarketingView'
import { Button } from '../ui/Button'
import { usePipelinePhases } from '../../hooks/usePipelinePhases'
import { SystemPhase } from '../../types/pipeline'
import UniversalFieldRenderer from '../fields/UniversalFieldRenderer'

interface TripsProdutoData {
    orcamento?: {
        total?: number
        por_pessoa?: number
    }
    epoca_viagem?: {
        inicio?: string
        fim?: string
        flexivel?: boolean
    }
    destinos?: string[]
    origem?: string
    origem_lead?: string
    motivo?: string
    taxa_planejamento?: string | number
    [key: string]: unknown
}

interface TripInformationProps {
    card: {
        id: string
        fase?: string | null
        pipeline_stage_id?: string | null
        // TODO: Define strict Json type matching Supabase
        briefing_inicial?: any
        marketing_data?: any
        produto_data?: any
        [key: string]: unknown
    }
}

type ViewMode = string

interface EditModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: () => void
    title: string
    children: React.ReactNode
    isSaving?: boolean
    isCorrection?: boolean
}

function EditModal({ isOpen, onClose, onSave, title, children, isSaving, isCorrection }: EditModalProps) {
    if (!isOpen) return null

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            const target = e.target as HTMLElement
            if (target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') {
                e.preventDefault()
                onSave()
            }
        }
        if (e.key === 'Escape') {
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onKeyDown={handleKeyDown}>
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={cn(
                "relative rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transition-all",
                isCorrection ? "bg-[#fffbf0] border-2 border-amber-200" : "bg-white"
            )}>
                <div className={cn(
                    "flex items-center justify-between px-5 py-4 border-b",
                    isCorrection ? "bg-amber-100/50" : "bg-gradient-to-r from-indigo-50 to-white"
                )}>
                    <div className="flex items-center gap-2">
                        {isCorrection && <AlertTriangle className="h-5 w-5 text-amber-600" />}
                        <h3 className={cn("text-lg font-semibold", isCorrection ? "text-amber-900" : "text-gray-900")}>
                            {title}
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-black/5 transition-colors">
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {isCorrection && (
                    <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex gap-3">
                        <div className="mt-0.5">
                            <History className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="text-xs text-amber-800">
                            <span className="font-bold block mb-0.5">Modo de Correção Histórica</span>
                            Você está alterando o registro original do SDR. Use isso para corrigir erros de digitação ou informações erradas.
                        </div>
                    </div>
                )}

                <div className="p-5">
                    {children}
                </div>

                <div className={cn("flex items-center justify-end gap-3 px-5 py-4 border-t", isCorrection ? "bg-amber-50/50" : "bg-gray-50")}>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className={cn(
                            "px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2",
                            isCorrection ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                        )}
                    >
                        {isSaving ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                {isCorrection ? <Eraser className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                                {isCorrection ? "Corrigir Registro" : "Salvar"}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

interface FieldCardProps {
    icon: React.ElementType
    iconColor: string
    label: string
    value: string | number | null | undefined
    fieldName?: string
    dataKey?: string
}

function FieldCard({ icon: Icon, iconColor, label, value }: FieldCardProps) {
    return (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2 mb-1">
                <div className={cn("p-1 rounded-md", iconColor)}>
                    <Icon className="h-3 w-3" />
                </div>
                <span className="text-xs font-medium text-gray-500 uppercase">{label}</span>
            </div>
            <div className="text-sm font-medium text-gray-900 pl-7">
                {value || '-'}
            </div>
        </div>
    )
}

const EMPTY_OBJECT = {}

export default function TripInformation({ card }: TripInformationProps) {
    // Fix: Use useMemo and a stable empty object to prevent infinite loops
    const productData = useMemo(() => (card.produto_data as any) || EMPTY_OBJECT, [card.produto_data])
    const briefingData = useMemo(() => (card.briefing_inicial as any) || EMPTY_OBJECT, [card.briefing_inicial])
    const marketingData = useMemo(() => (card.marketing_data as any) || EMPTY_OBJECT, [card.marketing_data])

    const [viewMode, setViewMode] = useState<ViewMode>(SystemPhase.SDR)
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editedData, setEditedData] = useState<TripsProdutoData>(productData)
    const [destinosInput, setDestinosInput] = useState('')
    const [correctionMode, setCorrectionMode] = useState(false)

    const queryClient = useQueryClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { missingBlocking, missingFuture } = useStageRequirements(card as any)
    const { getVisibleFields } = useFieldConfig()
    const { data: phases } = usePipelinePhases()

    // --- MODULARITY: Get all visible fields for 'trip_info' section ---
    const visibleFields = useMemo(() => {
        if (!card.pipeline_stage_id) return []
        // We specifically want 'trip_info' fields for the SDR/Planner view
        return getVisibleFields(card.pipeline_stage_id!, 'trip_info')
    }, [card.pipeline_stage_id, getVisibleFields])

    // Sync ViewMode with Card Stage
    useEffect(() => {
        if (!phases) return

        const currentPhase = phases.find(p => p.name === card.fase)

        // Only switch to current phase if it exists, has a slug, AND is visible
        if (currentPhase && currentPhase.slug && currentPhase.visible_in_card !== false) {
            setViewMode(currentPhase.slug)
        } else {
            // Default to SDR if phase not found or hidden
            const sdrPhase = phases.find(p => p.slug === SystemPhase.SDR)
            if (sdrPhase && sdrPhase.slug) setViewMode(sdrPhase.slug)
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
    }, [card.fase, phases])

    // Determine which data to display/edit based on ViewMode and CorrectionMode
    // SDR View: Shows briefingData (or productData if briefing is empty/synced)
    // Planner View: Shows productData (Proposal) AND briefingData (History)
    const activeData = (viewMode === SystemPhase.SDR || correctionMode) ? briefingData : productData

    useEffect(() => {
        setEditedData(activeData)
        // eslint-disable-next-line react-hooks/set-state-in-effect
    }, [activeData, viewMode, correctionMode])

    const updateCardMutation = useMutation({
        mutationFn: async ({ newData, target }: { newData: TripsProdutoData, target: 'produto_data' | 'briefing_inicial' }) => {
            const updates: Record<string, unknown> = { [target]: newData }

            // If updating 'produto_data' (Planner Proposal), sync legacy columns
            if (target === 'produto_data') {
                if (newData.orcamento?.total) updates.valor_estimado = newData.orcamento.total
                if (newData.epoca_viagem?.inicio) updates.data_viagem_inicio = newData.epoca_viagem.inicio
                else updates.data_viagem_inicio = null
                if (newData.epoca_viagem?.fim) updates.data_viagem_fim = newData.epoca_viagem.fim
                else updates.data_viagem_fim = null
            }
            // If updating 'briefing_inicial' (SDR Correction), ALSO sync 'produto_data' IF we are in SDR stage
            // This keeps them in sync until the Planner starts diverging
            else if (target === 'briefing_inicial') {
                const sdrPhase = phases?.find(p => p.slug === SystemPhase.SDR)
                const isSdr = sdrPhase && card.fase === sdrPhase.name

                if (isSdr) {
                    updates.produto_data = newData
                    // And sync legacy
                    if (newData.orcamento?.total) updates.valor_estimado = newData.orcamento.total
                    if (newData.epoca_viagem?.inicio) updates.data_viagem_inicio = newData.epoca_viagem.inicio
                    else updates.data_viagem_inicio = null
                    if (newData.epoca_viagem?.fim) updates.data_viagem_fim = newData.epoca_viagem.fim
                    else updates.data_viagem_fim = null
                }
            }

            const { error } = await (supabase.from('cards') as any)
                .update(updates)
                .eq('id', card.id!)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            setEditingField(null)
        }
    })

    const handleFieldSave = () => {
        // Target depends on:
        // 1. Correction Mode -> Always 'briefing_inicial'
        // 2. View Mode -> SDR = 'briefing_inicial', Planner = 'produto_data'
        const target = (correctionMode || viewMode === SystemPhase.SDR) ? 'briefing_inicial' : 'produto_data'

        updateCardMutation.mutate({
            newData: editedData,
            target
        })
    }

    const handleFieldEdit = (fieldName: string) => {
        setEditingField(fieldName)
    }

    const handleCloseModal = () => {
        setEditedData(activeData)
        setEditingField(null)
        setDestinosInput('')
    }

    const handleFieldChange = (fieldName: string, value: unknown) => {
        setEditedData(prev => ({ ...prev, [fieldName]: value }))
    }



    const getFieldStatus = (dataKey: string) => {
        if (viewMode !== SystemPhase.SDR && viewMode !== SystemPhase.PLANNER) return 'ok' // Only validate in early stages
        if (correctionMode) return 'ok'
        if (missingBlocking.some(req => req.field_key === dataKey)) return 'blocking'
        if (missingFuture.some(req => req.field_key === dataKey)) return 'attention'
        return 'ok'
    }

    // --- RENDERERS ---

    // --- MAIN RENDER ---
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-500">

            {/* VIEW SWITCHER */}
            <div className="border-b border-gray-200 bg-gray-50/50 px-4 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        Informações da Viagem
                    </h3>

                    {/* Correction Toggle (Only visible in Planner/SDR views) */}
                    {(viewMode === SystemPhase.SDR || viewMode === SystemPhase.PLANNER) && (
                        <button
                            onClick={() => setCorrectionMode(!correctionMode)}
                            className={cn(
                                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-sm",
                                correctionMode
                                    ? "bg-amber-50 text-amber-900 border-amber-200 ring-2 ring-amber-100"
                                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            <History className="h-3.5 w-3.5" />
                            {correctionMode ? "Sair da Correção" : "Corrigir Histórico SDR"}
                        </button>
                    )}
                </div>

                <div className="flex gap-6 overflow-x-auto pb-1 scrollbar-hide">
                    {phases?.filter(p => p.active && p.name !== 'Marketing')
                        .filter(p => p.visible_in_card !== false) // Respect visibility setting
                        .slice(0, 6) // Limit to 6 phases
                        .map(phase => {
                            const isActive = viewMode === phase.slug
                            // Determine icon based on slug or default
                            const Icon = phase.slug === SystemPhase.SDR ? Tag :
                                phase.slug === SystemPhase.PLANNER ? Plane :
                                    phase.slug === SystemPhase.POS_VENDA ? FileCheck : Tag

                            // Determine color
                            const activeColorClass = phase.slug === SystemPhase.SDR ? 'border-blue-500 text-blue-600' :
                                phase.slug === SystemPhase.PLANNER ? 'border-purple-500 text-purple-600' :
                                    phase.slug === SystemPhase.POS_VENDA ? 'border-green-500 text-green-600' :
                                        'border-indigo-500 text-indigo-600'

                            return (
                                <button
                                    key={phase.id}
                                    onClick={() => {
                                        if (phase.slug) {
                                            setViewMode(phase.slug)
                                            setCorrectionMode(false)
                                        }
                                    }}
                                    className={cn(
                                        "pb-3 text-sm font-medium border-b-2 transition-colors px-1 flex items-center gap-2 whitespace-nowrap",
                                        isActive
                                            ? activeColorClass
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    {phase.label || phase.name}
                                </button>
                            )
                        })}

                    {/* Fixed Marketing Button */}
                    <button
                        onClick={() => {
                            setViewMode('marketing')
                            setCorrectionMode(false)
                        }}
                        className={cn(
                            "pb-3 text-sm font-medium border-b-2 transition-colors px-1 flex items-center gap-2 whitespace-nowrap",
                            viewMode === 'marketing'
                                ? "border-pink-500 text-pink-600"
                                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                        )}
                    >
                        <Globe className="h-4 w-4" />
                        Marketing
                    </button>
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className={cn(
                "p-5",
                correctionMode && "bg-[#fffbf7]"
            )}>

                {/* MARKETING VIEW */}
                {viewMode === 'marketing' && (
                    <MarketingView cardId={card.id!} initialData={marketingData} />
                )}

                {/* DYNAMIC WATERFALL VIEW (SDR, PLANNER, POS_VENDA, etc) */}
                {(viewMode === SystemPhase.SDR || viewMode === SystemPhase.PLANNER || viewMode === SystemPhase.POS_VENDA || !['marketing'].includes(viewMode)) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {visibleFields.length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500 italic">
                                Nenhum campo configurado para esta fase.
                                <br />
                                <span className="text-xs">Configure na Matriz de Governança (Seção: Informações da Viagem).</span>
                            </div>
                        )}

                        {visibleFields.map(field => (
                            <UniversalFieldRenderer
                                key={field.key}
                                field={field}
                                value={activeData[field.key]}
                                sdrValue={briefingData[field.key]} // Keep SDR reference for comparison if needed
                                status={getFieldStatus(field.key)}
                                mode="display"
                                onEdit={() => handleFieldEdit(field.key)}
                                correctionMode={correctionMode}
                                isPlanner={viewMode === SystemPhase.PLANNER} // Controls "SDR Original" display
                            />
                        ))}
                    </div>
                )}

                {/* POS-VENDA VIEW (Still Hardcoded for now as it has specific logic, but could be modularized later) */}
                {viewMode === SystemPhase.POS_VENDA && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Pre-Trip */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Plane className="h-4 w-4" /> Pré-Embarque
                                </h4>
                                <div className="space-y-3">
                                    {/* Placeholder for Post-Sales Fields - In a real implementation these would be dynamic fields */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Vouchers Enviados</span>
                                        <Button variant="outline" size="sm" className="h-8 text-xs">
                                            <Upload className="h-3 w-3 mr-1" /> Upload
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="text-sm font-medium text-gray-700">Check-in Online</span>
                                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">Pendente</span>
                                    </div>
                                </div>
                            </div>

                            {/* Post-Trip */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <ThumbsUp className="h-4 w-4" /> Feedback & NPS
                                </h4>
                                <div className="space-y-3">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <label className="text-xs text-gray-500 block mb-1">NPS Score</label>
                                        <div className="flex gap-1">
                                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                <button key={n} className="w-6 h-6 rounded bg-white border border-gray-200 text-[10px] hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                                                    {n}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <label className="text-xs text-gray-500 block mb-1">Depoimento</label>
                                        <textarea className="w-full text-sm bg-white border border-gray-200 rounded p-2 h-20 resize-none" placeholder="O que o cliente achou?" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DYNAMIC PHASES VIEW (Generic Render) */}
                {!['sdr', 'planner', 'pos_venda', 'marketing'].includes(viewMode) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Render ALL visible fields for this dynamic phase */}
                        {getVisibleFields(card.pipeline_stage_id!).map((field: any) => (
                            <FieldCard
                                key={field.key}
                                icon={Tag} // Default icon
                                iconColor="bg-gray-100 text-gray-600"
                                label={field.label}
                                value={activeData[field.key] as string | number | null | undefined}
                                fieldName={field.key}
                                dataKey={field.key}
                            // For dynamic fields, we don't have a specific "sdrValue" concept yet, 
                            // unless we map it. For now, we leave it undefined.
                            />
                        ))}
                        {getVisibleFields(card.pipeline_stage_id!).length === 0 && (
                            <div className="col-span-full text-center py-8 text-gray-500 italic">
                                Nenhum campo configurado para esta fase.
                                <br />
                                <span className="text-xs">Configure na Matriz de Governança.</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* EDIT MODALS (Shared) */}
            <EditModal
                isOpen={editingField === 'motivo'}
                onClose={handleCloseModal}
                onSave={handleFieldSave}
                title="Motivo da Viagem"
                isSaving={updateCardMutation.isPending}
                isCorrection={correctionMode}
            >
                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Qual o motivo desta viagem?</label>
                    <input
                        type="text"
                        value={editedData.motivo || ''}
                        onChange={(e) => setEditedData({ ...editedData, motivo: e.target.value })}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        autoFocus
                    />
                </div>
            </EditModal>

            <EditModal
                isOpen={editingField === 'destinos'}
                onClose={handleCloseModal}
                onSave={handleFieldSave}
                title="Destino(s)"
                isSaving={updateCardMutation.isPending}
                isCorrection={correctionMode}
            >
                <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">Quais destinos estão sendo considerados?</label>
                    <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg shadow-sm bg-white min-h-[100px] content-start">
                        {editedData.destinos?.map((dest, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                                <MapPin className="h-3 w-3" /> {dest}
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newDestinos = [...(editedData.destinos || [])]
                                        newDestinos.splice(i, 1)
                                        setEditedData({ ...editedData, destinos: newDestinos })
                                    }}
                                    className="ml-1 p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-200 rounded-full"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            value={destinosInput}
                            onChange={(e) => setDestinosInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault()
                                    const val = destinosInput.trim().replace(/,/g, '')
                                    if (val) {
                                        const current = editedData.destinos || []
                                        if (!current.includes(val)) setEditedData({ ...editedData, destinos: [...current, val] })
                                        setDestinosInput('')
                                    }
                                }
                            }}
                            className="flex-1 min-w-[120px] border-none outline-none focus:ring-0 p-1 text-base bg-transparent"
                            placeholder={editedData.destinos?.length ? "" : "Digite um destino..."}
                            autoFocus
                        />
                    </div>
                </div>
            </EditModal>

            {/* Modal de Edição Genérico via UniversalFieldRenderer */}
            <EditModal
                isOpen={!!editingField && editingField !== 'orcamento' && editingField !== 'destinos'}
                onClose={handleCloseModal}
                onSave={handleFieldSave}
                title={visibleFields.find(f => f.key === editingField)?.label || 'Editar Campo'}
                isSaving={updateCardMutation.isPending}
                isCorrection={correctionMode}
            >
                {editingField && (
                    <UniversalFieldRenderer
                        field={visibleFields.find(f => f.key === editingField) || { key: editingField, label: editingField, type: 'text' }}
                        value={editedData[editingField]}
                        onChange={(val) => handleFieldChange(editingField, val)}
                        mode="edit"
                    />
                )}
            </EditModal>

            <EditModal
                isOpen={editingField === 'orcamento'}
                onClose={handleCloseModal}
                onSave={handleFieldSave}
                title="Orçamento"
                isSaving={updateCardMutation.isPending}
                isCorrection={correctionMode}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Orçamento Total (R$)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                            <input
                                type="number"
                                value={editedData.orcamento?.total || ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    orcamento: { ...editedData.orcamento, total: parseFloat(e.target.value) || 0 }
                                })}
                                className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Orçamento por Pessoa (R$)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                            <input
                                type="number"
                                value={editedData.orcamento?.por_pessoa || ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    orcamento: { ...editedData.orcamento, por_pessoa: parseFloat(e.target.value) || 0 }
                                })}
                                className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                </div>
            </EditModal>

            <EditModal
                isOpen={editingField === 'taxa_planejamento'}
                onClose={handleCloseModal}
                onSave={handleFieldSave}
                title="Taxa de Planejamento"
                isSaving={updateCardMutation.isPending}
                isCorrection={correctionMode}
            >
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <input
                            type="checkbox"
                            checked={editedData.taxa_planejamento === 'Cortesia'}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    setEditedData({ ...editedData, taxa_planejamento: 'Cortesia' })
                                } else {
                                    setEditedData({ ...editedData, taxa_planejamento: 0 })
                                }
                            }}
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-indigo-900">É Cortesia?</p>
                            <p className="text-xs text-indigo-700">Marque se não haverá cobrança de taxa.</p>
                        </div>
                    </div>

                    {editedData.taxa_planejamento !== 'Cortesia' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Valor da Taxa (R$)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                                <input
                                    type="number"
                                    value={typeof editedData.taxa_planejamento === 'number' ? editedData.taxa_planejamento : ''}
                                    onChange={(e) => setEditedData({
                                        ...editedData,
                                        taxa_planejamento: parseFloat(e.target.value) || 0
                                    })}
                                    className="w-full pl-12 pr-4 py-3 text-lg font-semibold text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0,00"
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}
                </div>
            </EditModal>

            {/* GENERIC EDIT MODAL */}
            {editingField && !['motivo', 'destinos', 'periodo', 'orcamento', 'taxa_planejamento'].includes(editingField) && (
                <EditModal
                    isOpen={true}
                    onClose={handleCloseModal}
                    onSave={handleFieldSave}
                    title={visibleFields.find(f => f.key === editingField)?.label || 'Editar Campo'}
                    isSaving={updateCardMutation.isPending}
                    isCorrection={correctionMode}
                >
                    <div className="space-y-2">
                        {(() => {
                            const field = visibleFields.find(f => f.key === editingField)
                            if (!field) return null
                            return (
                                <UniversalFieldRenderer
                                    field={field}
                                    value={editedData[field.key]}
                                    mode="edit"
                                    onChange={(val) => setEditedData({ ...editedData, [field.key]: val })}
                                />
                            )
                        })()}
                    </div>
                </EditModal>
            )}
        </div>
    )
}
