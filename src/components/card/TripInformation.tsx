import { useState, useEffect, useMemo } from 'react'
import { MapPin, Calendar, DollarSign, Tag, X, Check, Edit2, History, AlertCircle, Globe, AlertTriangle, Eraser, Plane, FileCheck, ThumbsUp, Upload } from 'lucide-react'
import type { Database } from '../../database.types'
import { supabase } from '../../lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '../../lib/utils'
import { useStageRequirements } from '../../hooks/useStageRequirements'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import MarketingView from './MarketingView'
import { Button } from '../ui/Button'
import { usePipelinePhases } from '../../hooks/usePipelinePhases'
import { SystemPhase } from '../../types/pipeline'

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
    [key: string]: any
}

type Card = Database['public']['Views']['view_cards_acoes']['Row'] & {
    briefing_inicial?: TripsProdutoData | null
    marketing_data?: any | null
}

interface TripInformationProps {
    card: Card
}

type ViewMode = 'SDR' | 'PLANNER' | 'POS_VENDA' | 'MARKETING'

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
            if (target.tagName !== 'TEXTAREA') {
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

const EMPTY_OBJECT = {}

export default function TripInformation({ card }: TripInformationProps) {
    // Fix: Use useMemo and a stable empty object to prevent infinite loops
    const productData = useMemo(() => (card.produto_data as TripsProdutoData) || EMPTY_OBJECT, [card.produto_data])
    const briefingData = useMemo(() => (card.briefing_inicial as TripsProdutoData) || EMPTY_OBJECT, [card.briefing_inicial])
    const marketingData = useMemo(() => (card.marketing_data as any) || EMPTY_OBJECT, [card.marketing_data])

    const [viewMode, setViewMode] = useState<ViewMode>('SDR')
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editedData, setEditedData] = useState<TripsProdutoData>(productData)
    const [destinosInput, setDestinosInput] = useState('')
    const [correctionMode, setCorrectionMode] = useState(false)

    const queryClient = useQueryClient()
    const { missingBlocking, missingFuture } = useStageRequirements(card)
    const { } = useFieldConfig()
    const { data: phases } = usePipelinePhases()

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

    // Determine which data to display/edit based on ViewMode and CorrectionMode
    // SDR View: Shows briefingData (or productData if briefing is empty/synced)
    // Planner View: Shows productData (Proposal) AND briefingData (History)
    const activeData = (viewMode === 'SDR' || correctionMode) ? briefingData : productData

    useEffect(() => {
        setEditedData(activeData)
    }, [activeData, viewMode, correctionMode])

    const updateCardMutation = useMutation({
        mutationFn: async ({ newData, target }: { newData: TripsProdutoData, target: 'produto_data' | 'briefing_inicial' }) => {
            const updates: any = { [target]: newData }

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
        const target = (correctionMode || viewMode === 'SDR') ? 'briefing_inicial' : 'produto_data'

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

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    }

    const formatBudget = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getFieldStatus = (dataKey: string) => {
        if (viewMode !== 'SDR' && viewMode !== 'PLANNER') return 'ok' // Only validate in early stages
        if (correctionMode) return 'ok'
        if (missingBlocking.some(req => req.field_key === dataKey)) return 'blocking'
        if (missingFuture.some(req => req.field_key === dataKey)) return 'attention'
        return 'ok'
    }

    // --- RENDERERS ---

    const FieldCard = ({ icon: Icon, iconColor, label, value, subValue, fieldName, dataKey, sdrValue }: any) => {
        const status = getFieldStatus(dataKey)
        const isPlanner = viewMode === 'PLANNER'
        // Always show SDR section if we are in Planner mode
        const showSdrSection = isPlanner

        return (
            <div
                className={cn(
                    "group relative p-4 rounded-xl border transition-all duration-200",
                    correctionMode
                        ? "bg-[#fdfbf7] border-amber-200/50 border-dashed hover:border-amber-300 hover:bg-[#fffdf9] cursor-pointer"
                        : cn(
                            "bg-white",
                            status === 'blocking' ? "border-red-300 bg-red-50/30" :
                                status === 'attention' ? "border-orange-300 bg-orange-50/30" :
                                    "border-gray-300",
                            "hover:shadow-md cursor-pointer",
                            status === 'blocking' && "hover:border-red-400",
                            status === 'attention' && "hover:border-orange-400",
                            status === 'ok' && "hover:border-indigo-400"
                        )
                )}
                onClick={() => handleFieldEdit(fieldName)}
            >
                <div className={cn(
                    "absolute top-3 right-3 transition-opacity",
                    correctionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {correctionMode ? (
                        <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            <Eraser className="h-3 w-3" /> Corrigir
                        </div>
                    ) : (
                        <Edit2 className="h-4 w-4 text-indigo-500" />
                    )}
                </div>

                {status !== 'ok' && !correctionMode && (
                    <div className={cn(
                        "absolute -top-2 -right-2 p-1 rounded-full shadow-sm border",
                        status === 'blocking' ? "bg-red-100 border-red-200 text-red-600" : "bg-orange-100 border-orange-200 text-orange-600"
                    )}>
                        <AlertCircle className="h-3 w-3" />
                    </div>
                )}

                <div className="flex items-start gap-3">
                    <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        correctionMode ? "bg-gray-100 text-gray-400 grayscale" : iconColor
                    )}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-2",
                            correctionMode ? "text-gray-400 font-mono" : "text-gray-500"
                        )}>
                            {label}
                            {status === 'blocking' && <span className="text-[10px] text-red-600 font-bold font-sans">Obrigatório</span>}
                        </p>

                        {/* Main Value (Planner's Plan) */}
                        <div className={cn(
                            "text-sm truncate",
                            correctionMode ? "font-mono text-gray-700 font-medium" : "font-semibold text-gray-900"
                        )}>
                            {value || (
                                status === 'blocking' ? <span className="text-red-500 italic font-medium font-sans">Obrigatório</span> :
                                    <span className="text-gray-400 italic font-normal font-sans">Não informado</span>
                            )}
                        </div>
                        {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}

                        {/* SDR Reference Section (Always visible in Planner View) */}
                        {showSdrSection && (
                            <div className="mt-3 pt-2 border-t border-gray-100">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                        SDR
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100">
                                    {sdrValue || <span className="text-gray-400 italic">Não informado pelo SDR</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // --- MAIN RENDER ---
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden transition-all duration-500">

            {/* VIEW SWITCHER */}
            <div className="border-b border-gray-200 bg-gray-50/50 px-4 pt-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        {viewMode === 'SDR' && <Tag className="h-4 w-4 text-blue-600" />}
                        {viewMode === 'PLANNER' && <Plane className="h-4 w-4 text-purple-600" />}
                        {viewMode === 'POS_VENDA' && <FileCheck className="h-4 w-4 text-green-600" />}
                        {viewMode === 'MARKETING' && <Globe className="h-4 w-4 text-pink-600" />}

                        {viewMode === 'SDR' && "Briefing & Qualificação"}
                        {viewMode === 'PLANNER' && "Construção da Proposta"}
                        {viewMode === 'POS_VENDA' && "Entrega & Pós-Venda"}
                        {viewMode === 'MARKETING' && "Marketing & Origem"}
                    </h3>

                    {/* Correction Toggle (Only visible in Planner/SDR views) */}
                    {(viewMode === 'SDR' || viewMode === 'PLANNER') && (
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

                <div className="flex gap-6">
                    {[
                        { id: 'SDR', label: 'SDR', color: 'border-blue-500 text-blue-600' },
                        { id: 'PLANNER', label: 'Planner', color: 'border-purple-500 text-purple-600' },
                        { id: 'POS_VENDA', label: 'Pós-Venda', color: 'border-green-500 text-green-600' },
                        { id: 'MARKETING', label: 'Marketing', color: 'border-pink-500 text-pink-600' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setViewMode(tab.id as ViewMode)
                                setCorrectionMode(false)
                            }}
                            className={cn(
                                "pb-3 text-sm font-medium border-b-2 transition-colors px-1",
                                viewMode === tab.id
                                    ? tab.color
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className={cn(
                "p-5",
                correctionMode && "bg-[#fffbf7]"
            )}>

                {/* MARKETING VIEW */}
                {viewMode === 'MARKETING' && (
                    <MarketingView cardId={card.id!} initialData={marketingData} />
                )}

                {/* SDR & PLANNER VIEWS (Shared Fields, Different Context) */}
                {(viewMode === 'SDR' || viewMode === 'PLANNER') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Motivo */}
                        <FieldCard
                            icon={Tag}
                            iconColor="bg-purple-100 text-purple-600"
                            label="Motivo da Viagem"
                            value={activeData.motivo}
                            fieldName="motivo"
                            dataKey="motivo"
                            sdrValue={briefingData.motivo}
                        />

                        {/* Destinos */}
                        <FieldCard
                            icon={MapPin}
                            iconColor="bg-blue-100 text-blue-600"
                            label="Destinos"
                            value={activeData.destinos?.length ? activeData.destinos.join(' • ') : undefined}
                            fieldName="destinos"
                            dataKey="destinos"
                            sdrValue={briefingData.destinos?.join(' • ')}
                        />

                        {/* Período */}
                        <FieldCard
                            icon={Calendar}
                            iconColor="bg-orange-100 text-orange-600"
                            label="Período"
                            value={activeData.epoca_viagem?.inicio ? (
                                <>
                                    {formatDate(activeData.epoca_viagem.inicio)}
                                    {activeData.epoca_viagem.fim && ` até ${formatDate(activeData.epoca_viagem.fim)}`}
                                </>
                            ) : undefined}
                            subValue={activeData.epoca_viagem?.flexivel ? '📌 Datas flexíveis' : undefined}
                            fieldName="periodo"
                            dataKey="epoca_viagem"
                            sdrValue={briefingData.epoca_viagem?.inicio ? formatDate(briefingData.epoca_viagem.inicio) : undefined}
                        />

                        {/* Orçamento */}
                        <FieldCard
                            icon={DollarSign}
                            iconColor="bg-green-100 text-green-600"
                            label="Orçamento"
                            value={activeData.orcamento?.total ? formatBudget(activeData.orcamento.total) : undefined}
                            subValue={activeData.orcamento?.por_pessoa ? `${formatBudget(activeData.orcamento.por_pessoa)} por pessoa` : undefined}
                            fieldName="orcamento"
                            dataKey="orcamento"
                            sdrValue={briefingData.orcamento?.total ? formatBudget(briefingData.orcamento.total) : undefined}
                        />
                    </div>
                )}

                {/* POS-VENDA VIEW */}
                {viewMode === 'POS_VENDA' && (
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

            <EditModal
                isOpen={editingField === 'periodo'}
                onClose={handleCloseModal}
                onSave={handleFieldSave}
                title="Período da Viagem"
                isSaving={updateCardMutation.isPending}
                isCorrection={correctionMode}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Ida</label>
                            <input
                                type="date"
                                value={editedData.epoca_viagem?.inicio ? editedData.epoca_viagem.inicio.substring(0, 10) : ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    epoca_viagem: { ...editedData.epoca_viagem, inicio: e.target.value }
                                })}
                                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Data de Volta</label>
                            <input
                                type="date"
                                value={editedData.epoca_viagem?.fim ? editedData.epoca_viagem.fim.substring(0, 10) : ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    epoca_viagem: { ...editedData.epoca_viagem, fim: e.target.value }
                                })}
                                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                            type="checkbox"
                            checked={editedData.epoca_viagem?.flexivel || false}
                            onChange={(e) => setEditedData({
                                ...editedData,
                                epoca_viagem: { ...editedData.epoca_viagem, flexivel: e.target.checked }
                            })}
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div>
                            <p className="text-sm font-medium text-gray-900">Datas flexíveis</p>
                            <p className="text-xs text-gray-500">O cliente tem flexibilidade nas datas</p>
                        </div>
                    </label>
                </div>
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
        </div>
    )
}
