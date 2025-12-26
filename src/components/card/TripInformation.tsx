import { useState, useEffect } from 'react'
import { MapPin, Calendar, DollarSign, Tag, TrendingUp, X, Check, Edit2, History, AlertCircle, FileText, Globe, CreditCard, AlertTriangle, Eraser } from 'lucide-react'
import type { Database } from '../../database.types'
import { supabase } from '../../lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '../../lib/utils'
import { useStageRequirements } from '../../hooks/useStageRequirements'
import { useFieldConfig } from '../../hooks/useFieldConfig'

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
}

interface TripInformationProps {
    card: Card
}

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

    // Handle Enter key to save
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Don't trigger on textarea (allow line breaks there)
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
                {/* Header */}
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
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-black/5 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Warning for Correction Mode */}
                {isCorrection && (
                    <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 flex gap-3">
                        <div className="mt-0.5">
                            <History className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="text-xs text-amber-800">
                            <span className="font-bold block mb-0.5">Modo de Correção Histórica</span>
                            Você está alterando o registro original do pedido. Use apenas para corrigir erros de digitação ou informações que foram registradas erradas no passado.
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="p-5">
                    {children}
                </div>

                {/* Footer */}
                <div className={cn("flex items-center justify-end gap-3 px-5 py-4 border-t", isCorrection ? "bg-amber-50/50" : "bg-gray-50")}>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
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

export default function TripInformation({ card }: TripInformationProps) {
    const productData = (card.produto_data as TripsProdutoData) || {}
    const briefingData = (card.briefing_inicial as TripsProdutoData) || {}

    const [editingField, setEditingField] = useState<string | null>(null)
    const [editedData, setEditedData] = useState<TripsProdutoData>(productData)
    const [destinosInput, setDestinosInput] = useState('')
    const [showBriefing, setShowBriefing] = useState(false)
    const queryClient = useQueryClient()

    const { missingBlocking, missingFuture } = useStageRequirements(card)

    const displayData = showBriefing ? briefingData : productData

    const { getVisibleFields } = useFieldConfig()
    // Get fields for 'trip_info' section (or 'details' if legacy)
    // We might want to show multiple sections here? For now let's assume 'trip_info' covers it.
    // Actually, the previous code fetched ALL active system fields. 
    // But TripInformation is semantically about the trip.
    // Let's get 'trip_info' section fields.
    const visibleFields = card.pipeline_stage_id ? getVisibleFields(card.pipeline_stage_id, 'trip_info') : []

    // Update editedData when card or mode changes
    useEffect(() => {
        setEditedData(showBriefing ? briefingData : productData)
    }, [card.produto_data, card.briefing_inicial, showBriefing])

    const updateCardMutation = useMutation({
        mutationFn: async ({ newData, target }: { newData: TripsProdutoData, target: 'produto_data' | 'briefing_inicial' }) => {
            const updates: any = { [target]: newData }

            // Only sync legacy columns if we are updating the CURRENT product data
            if (target === 'produto_data') {
                // Wave 1B: Sync Budget to Value
                if (newData.orcamento?.total) {
                    updates.valor_estimado = newData.orcamento.total
                }
                // Sync Trip Dates
                if (newData.epoca_viagem?.inicio) {
                    updates.data_viagem_inicio = newData.epoca_viagem.inicio
                } else {
                    updates.data_viagem_inicio = null
                }
                if (newData.epoca_viagem?.fim) {
                    updates.data_viagem_fim = newData.epoca_viagem.fim
                } else {
                    updates.data_viagem_fim = null
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
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            setEditingField(null)
        }
    })

    const handleFieldSave = () => {
        updateCardMutation.mutate({
            newData: editedData,
            target: showBriefing ? 'briefing_inicial' : 'produto_data'
        })
    }

    const handleFieldEdit = (fieldName: string) => {
        setEditingField(fieldName)
    }

    const handleCloseModal = () => {
        setEditedData(showBriefing ? briefingData : productData)
        setEditingField(null)
        setDestinosInput('')
    }

    const formatDate = (dateStr: string) => {
        if (!dateStr) return ''
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        })
    }

    const formatBudget = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const getFieldStatus = (dataKey: string) => {
        // Briefing mode doesn't show validation errors (it's history)
        if (showBriefing) return 'ok'

        if (missingBlocking.some(req => req.field_key === dataKey)) return 'blocking'
        if (missingFuture.some(req => req.field_key === dataKey)) return 'attention'
        return 'ok'
    }

    // Field Card Component
    const FieldCard = ({
        icon: Icon,
        iconColor,
        label,
        value,
        subValue,
        fieldName,
        dataKey
    }: {
        icon: any
        iconColor: string
        label: string
        value: string | React.ReactNode
        subValue?: string
        fieldName: string
        dataKey: string
    }) => {
        const status = getFieldStatus(dataKey)

        return (
            <div
                className={cn(
                    "group relative p-4 rounded-xl border transition-all duration-200",
                    // Visual Styles based on Mode
                    showBriefing
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
                {/* Edit/Correction Icon */}
                <div className={cn(
                    "absolute top-3 right-3 transition-opacity",
                    showBriefing ? "opacity-0 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                    {showBriefing ? (
                        <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                            <Eraser className="h-3 w-3" />
                            Corrigir
                        </div>
                    ) : (
                        <Edit2 className="h-4 w-4 text-indigo-500" />
                    )}
                </div>

                {/* Status Indicator (Only in Normal Mode) */}
                {status !== 'ok' && !showBriefing && (
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
                        showBriefing ? "bg-gray-100 text-gray-400 grayscale" : iconColor
                    )}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-2",
                            showBriefing ? "text-gray-400 font-mono" : "text-gray-500"
                        )}>
                            {label}
                            {status === 'blocking' && <span className="text-[10px] text-red-600 font-bold font-sans">Obrigatório</span>}
                            {status === 'attention' && <span className="text-[10px] text-orange-600 font-bold font-sans">Futuro</span>}
                        </p>
                        <div className={cn(
                            "text-sm truncate",
                            showBriefing ? "font-mono text-gray-700 font-medium" : "font-semibold text-gray-900"
                        )}>
                            {value || (
                                status === 'blocking' ? <span className="text-red-500 italic font-medium font-sans">Obrigatório</span> :
                                    <span className="text-gray-400 italic font-normal font-sans">Não informado</span>
                            )}
                        </div>
                        {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
                    </div>
                </div>
            </div>
        )
    }

    // Generic Render Function
    const renderField = (field: any) => {
        // Handle Legacy/Complex Fields
        if (field.key === 'epoca_viagem') {
            return (
                <FieldCard
                    key={field.key}
                    icon={Calendar}
                    iconColor="bg-orange-100 text-orange-600"
                    label={field.label}
                    value={displayData.epoca_viagem?.inicio ? (
                        <>
                            {formatDate(displayData.epoca_viagem.inicio)}
                            {displayData.epoca_viagem.fim && ` até ${formatDate(displayData.epoca_viagem.fim)}`}
                        </>
                    ) : undefined}
                    subValue={displayData.epoca_viagem?.flexivel ? '📌 Datas flexíveis' : undefined}
                    fieldName="periodo" // Maps to legacy modal
                    dataKey="epoca_viagem"
                />
            )
        }

        if (field.key === 'orcamento') {
            return (
                <FieldCard
                    key={field.key}
                    icon={DollarSign}
                    iconColor="bg-green-100 text-green-600"
                    label={field.label}
                    value={displayData.orcamento?.total ? formatBudget(displayData.orcamento.total) : undefined}
                    subValue={displayData.orcamento?.por_pessoa ? `${formatBudget(displayData.orcamento.por_pessoa)} por pessoa` : undefined}
                    fieldName="orcamento" // Maps to legacy modal
                    dataKey="orcamento"
                />
            )
        }

        if (field.key === 'destinos') {
            return (
                <FieldCard
                    key={field.key}
                    icon={MapPin}
                    iconColor="bg-blue-100 text-blue-600"
                    label={field.label}
                    value={displayData.destinos?.length ? displayData.destinos.join(' • ') : undefined}
                    fieldName="destinos" // Maps to legacy modal
                    dataKey="destinos"
                />
            )
        }

        if (field.key === 'origem' || field.key === 'origem_lead') {
            const val = (displayData as any).origem_lead || (displayData as any).origem
            return (
                <FieldCard
                    key={field.key}
                    icon={TrendingUp}
                    iconColor="bg-cyan-100 text-cyan-600"
                    label={field.label}
                    value={val}
                    fieldName="origem" // Maps to legacy modal
                    dataKey="origem_lead"
                />
            )
        }

        if (field.key === 'motivo') {
            return (
                <FieldCard
                    key={field.key}
                    icon={Tag}
                    iconColor="bg-purple-100 text-purple-600"
                    label={field.label}
                    value={displayData.motivo}
                    fieldName="motivo" // Maps to legacy modal
                    dataKey="motivo"
                />
            )
        }

        // Generic Field Rendering
        let Icon = FileText
        let iconColor = "bg-gray-100 text-gray-600"

        if (field.type === 'date') {
            Icon = Calendar
            iconColor = "bg-pink-100 text-pink-600"
        } else if (field.type === 'currency') {
            Icon = CreditCard
            iconColor = "bg-emerald-100 text-emerald-600"
        } else if (field.type === 'select' || field.type === 'multiselect') {
            Icon = Globe
            iconColor = "bg-indigo-100 text-indigo-600"
        }

        let value = (displayData as any)[field.key]
        if (field.type === 'date' && value) {
            value = formatDate(value)
        } else if (field.type === 'currency' && value) {
            value = formatBudget(value)
        }

        return (
            <FieldCard
                key={field.key}
                icon={Icon}
                iconColor={iconColor}
                label={field.label}
                value={value}
                fieldName={field.key} // Maps to generic modal
                dataKey={field.key}
            />
        )
    }

    // Generic Input Renderer
    const renderGenericInput = (field: any) => {
        const value = (editedData as any)[field.key] || ''

        if (field.type === 'text') {
            return (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => setEditedData({ ...editedData, [field.key]: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                />
            )
        }

        if (field.type === 'number' || field.type === 'currency') {
            return (
                <input
                    type="number"
                    value={value}
                    onChange={(e) => setEditedData({ ...editedData, [field.key]: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                />
            )
        }

        if (field.type === 'date') {
            return (
                <input
                    type="date"
                    value={value}
                    onChange={(e) => setEditedData({ ...editedData, [field.key]: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                />
            )
        }

        if (field.type === 'select') {
            return (
                <select
                    value={value}
                    onChange={(e) => setEditedData({ ...editedData, [field.key]: e.target.value })}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    autoFocus
                >
                    <option value="">Selecione...</option>
                    {field.options?.map((opt: string) => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            )
        }

        return (
            <p className="text-red-500">Tipo de campo não suportado: {field.type}</p>
        )
    }


    return (
        <div className={cn(
            "rounded-xl border shadow-sm transition-all duration-500",
            showBriefing
                ? "border-amber-200 bg-[#fdfbf7] shadow-inner" // Blueprint Theme
                : "border-gray-300 bg-gradient-to-br from-white via-gray-50/50 to-indigo-50/30"
        )}>
            <div className="mb-4 p-5 pb-0 flex items-center justify-between">
                <div>
                    <h3 className={cn("text-base font-semibold flex items-center gap-2", showBriefing ? "text-amber-900 font-mono tracking-tight" : "text-gray-900")}>
                        <div className={cn("p-1.5 rounded-lg transition-colors", showBriefing ? "bg-amber-100" : "bg-indigo-100")}>
                            {showBriefing ? <History className="h-4 w-4 text-amber-600" /> : <Tag className="h-4 w-4 text-indigo-600" />}
                        </div>
                        {showBriefing ? "BRIEFING_INICIAL.json" : "Informações da Viagem"}
                    </h3>
                    <p className={cn("text-xs mt-1 ml-8 transition-colors", showBriefing ? "text-amber-700 font-medium font-mono" : "text-gray-500")}>
                        {showBriefing ? "Registro imutável do pedido original (Snapshot)" : "Clique em um campo para editar"}
                    </p>
                </div>
                <button
                    onClick={() => setShowBriefing(!showBriefing)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-sm",
                        showBriefing
                            ? "bg-white text-amber-900 border-amber-200 hover:bg-amber-50 ring-2 ring-amber-100"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                >
                    <History className="h-3.5 w-3.5" />
                    {showBriefing ? "Voltar ao Atual" : "Ver Original"}
                </button>
            </div>

            <div className="p-5 pt-0">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visibleFields.map(field => renderField(field))}
                </div>

                {/* Cliente Recorrente */}
                {card.cliente_recorrente && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl flex items-center gap-2">
                        <span className="text-xl">⭐</span>
                        <p className="text-sm font-medium text-amber-800">
                            Cliente Recorrente — Já viajou com a Welcome antes
                        </p>
                    </div>
                )}

                {/* === MODAIS DE EDIÇÃO === */}

                {/* Modal: Motivo */}
                <EditModal
                    isOpen={editingField === 'motivo'}
                    onClose={handleCloseModal}
                    onSave={handleFieldSave}
                    title="Motivo da Viagem"
                    isSaving={updateCardMutation.isPending}
                    isCorrection={showBriefing}
                >
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Qual o motivo desta viagem?
                        </label>
                        <input
                            type="text"
                            value={editedData.motivo || ''}
                            onChange={(e) => setEditedData({ ...editedData, motivo: e.target.value })}
                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            placeholder="Ex: Lua de Mel, Férias em Família, Aniversário..."
                            autoFocus
                        />
                    </div>
                </EditModal>

                {/* Modal: Destinos */}
                <EditModal
                    isOpen={editingField === 'destinos'}
                    onClose={handleCloseModal}
                    onSave={handleFieldSave}
                    title="Destino(s)"
                    isSaving={updateCardMutation.isPending}
                    isCorrection={showBriefing}
                >
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Quais destinos estão sendo considerados?
                        </label>
                        <div className="flex flex-wrap gap-2 p-3 border border-gray-300 rounded-lg shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white min-h-[100px] content-start">
                            {editedData.destinos?.map((dest, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                >
                                    <MapPin className="h-3 w-3" />
                                    {dest}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newDestinos = [...(editedData.destinos || [])]
                                            newDestinos.splice(i, 1)
                                            setEditedData({ ...editedData, destinos: newDestinos })
                                        }}
                                        className="ml-1 p-0.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-200 rounded-full transition-colors"
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
                                        e.stopPropagation()
                                        const val = destinosInput.trim().replace(/,/g, '')
                                        if (val) {
                                            const current = editedData.destinos || []
                                            if (!current.includes(val)) {
                                                setEditedData({ ...editedData, destinos: [...current, val] })
                                            }
                                            setDestinosInput('')
                                        }
                                    } else if (e.key === 'Backspace' && destinosInput === '' && (editedData.destinos?.length || 0) > 0) {
                                        const newDestinos = [...(editedData.destinos || [])]
                                        newDestinos.pop()
                                        setEditedData({ ...editedData, destinos: newDestinos })
                                    }
                                }}
                                onBlur={() => {
                                    const val = destinosInput.trim().replace(/,/g, '')
                                    if (val) {
                                        const current = editedData.destinos || []
                                        if (!current.includes(val)) {
                                            setEditedData({ ...editedData, destinos: [...current, val] })
                                        }
                                        setDestinosInput('')
                                    }
                                }}
                                className="flex-1 min-w-[120px] border-none outline-none focus:ring-0 p-1 text-base bg-transparent"
                                placeholder={editedData.destinos?.length ? "" : "Digite um destino..."}
                                autoFocus
                            />
                        </div>
                        <p className="text-xs text-gray-500">💡 Digite e pressione Enter ou Vírgula para adicionar</p>
                    </div>
                </EditModal>

                {/* Modal: Período */}
                <EditModal
                    isOpen={editingField === 'periodo'}
                    onClose={handleCloseModal}
                    onSave={handleFieldSave}
                    title="Período da Viagem"
                    isSaving={updateCardMutation.isPending}
                    isCorrection={showBriefing}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Data de Ida
                                </label>
                                <input
                                    type="date"
                                    value={editedData.epoca_viagem?.inicio ? editedData.epoca_viagem.inicio.substring(0, 10) : ''}
                                    onChange={(e) => setEditedData({
                                        ...editedData,
                                        epoca_viagem: {
                                            ...editedData.epoca_viagem,
                                            inicio: e.target.value,
                                            fim: editedData.epoca_viagem?.fim || '',
                                            flexivel: editedData.epoca_viagem?.flexivel || false
                                        }
                                    })}
                                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Data de Volta
                                </label>
                                <input
                                    type="date"
                                    value={editedData.epoca_viagem?.fim ? editedData.epoca_viagem.fim.substring(0, 10) : ''}
                                    onChange={(e) => setEditedData({
                                        ...editedData,
                                        epoca_viagem: {
                                            ...editedData.epoca_viagem,
                                            inicio: editedData.epoca_viagem?.inicio || '',
                                            fim: e.target.value,
                                            flexivel: editedData.epoca_viagem?.flexivel || false
                                        }
                                    })}
                                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>
                        </div>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            <input
                                type="checkbox"
                                checked={editedData.epoca_viagem?.flexivel || false}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    epoca_viagem: {
                                        ...editedData.epoca_viagem,
                                        inicio: editedData.epoca_viagem?.inicio || '',
                                        fim: editedData.epoca_viagem?.fim || '',
                                        flexivel: e.target.checked
                                    }
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

                {/* Modal: Orçamento */}
                <EditModal
                    isOpen={editingField === 'orcamento'}
                    onClose={handleCloseModal}
                    onSave={handleFieldSave}
                    title="Orçamento"
                    isSaving={updateCardMutation.isPending}
                    isCorrection={showBriefing}
                >
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Orçamento Total (R$)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                <input
                                    type="number"
                                    value={editedData.orcamento?.total || ''}
                                    onChange={(e) => setEditedData({
                                        ...editedData,
                                        orcamento: {
                                            ...editedData.orcamento,
                                            total: parseFloat(e.target.value) || 0,
                                            por_pessoa: editedData.orcamento?.por_pessoa || 0
                                        }
                                    })}
                                    className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Orçamento por Pessoa (R$)
                            </label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                <input
                                    type="number"
                                    value={editedData.orcamento?.por_pessoa || ''}
                                    onChange={(e) => setEditedData({
                                        ...editedData,
                                        orcamento: {
                                            ...editedData.orcamento,
                                            total: editedData.orcamento?.total || 0,
                                            por_pessoa: parseFloat(e.target.value) || 0
                                        }
                                    })}
                                    className="w-full pl-12 pr-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="0,00"
                                />
                            </div>
                        </div>
                    </div>
                </EditModal>

                {/* Modal: Origem do Lead */}
                <EditModal
                    isOpen={editingField === 'origem'}
                    onClose={handleCloseModal}
                    onSave={handleFieldSave}
                    title="Origem do Lead"
                    isSaving={updateCardMutation.isPending}
                    isCorrection={showBriefing}
                >
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                            Por onde este lead chegou?
                        </label>
                        <input
                            type="text"
                            value={(editedData as any).origem_lead || ''}
                            onChange={(e) => setEditedData({ ...editedData, origem_lead: e.target.value } as any)}
                            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                            placeholder="Ex: Instagram, Indicação, Google, Feira de Turismo..."
                            autoFocus
                        />
                        <div className="flex flex-wrap gap-2 pt-2">
                            {['Instagram', 'Indicação', 'Google', 'Facebook', 'Site', 'Feira'].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setEditedData({ ...editedData, origem_lead: option } as any)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 rounded-full transition-colors"
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                </EditModal>

                {/* Generic Modal for New Fields */}
                {editingField && !['motivo', 'destinos', 'periodo', 'orcamento', 'origem'].includes(editingField) && (
                    <EditModal
                        isOpen={true}
                        onClose={handleCloseModal}
                        onSave={handleFieldSave}
                        title={visibleFields.find(f => f.key === editingField)?.label || 'Editar Campo'}
                        isSaving={updateCardMutation.isPending}
                        isCorrection={showBriefing}
                    >
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                {visibleFields.find(f => f.key === editingField)?.label}
                            </label>
                            {renderGenericInput(visibleFields.find(f => f.key === editingField))}
                        </div>
                    </EditModal>
                )}
            </div>
        </div>
    )
}
