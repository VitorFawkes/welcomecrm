import { useState, useEffect } from 'react'
import { MapPin, Calendar, DollarSign, Tag, TrendingUp, X, Check, Edit2, History, AlertCircle } from 'lucide-react'
import type { Database, TripsProdutoData } from '../../database.types'
import { supabase } from '../../lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '../../lib/utils'
import { useStageRequirements } from '../../hooks/useStageRequirements'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

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
}

function EditModal({ isOpen, onClose, onSave, title, children, isSaving }: EditModalProps) {
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
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b bg-gradient-to-r from-indigo-50 to-white">
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-5">
                    {children}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onSave}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Check className="h-4 w-4" />
                                Salvar
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

    const [editingField, setEditingField] = useState<string | null>(null)
    const [editedData, setEditedData] = useState<TripsProdutoData>(productData)
    const [destinosInput, setDestinosInput] = useState('')
    const [showBriefing, setShowBriefing] = useState(false)
    const queryClient = useQueryClient()

    const { missingBlocking, missingFuture } = useStageRequirements(card)

    const displayData = showBriefing ? ((card as any).briefing_inicial as TripsProdutoData || {}) : productData

    // Update editedData when card changes
    useEffect(() => {
        setEditedData((card.produto_data as TripsProdutoData) || {})
    }, [card.produto_data])

    const updateCardMutation = useMutation({
        mutationFn: async (newData: TripsProdutoData) => {
            const updates: any = { produto_data: newData }

            // Wave 1B: Sync Budget to Value
            // If budget total exists, update valor_estimado
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
        updateCardMutation.mutate(editedData)
    }

    const handleFieldEdit = (fieldName: string) => {
        setEditingField(fieldName)
    }

    const handleCloseModal = () => {
        setEditedData((card.produto_data as TripsProdutoData) || {})
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
                    "group relative p-4 bg-white rounded-xl border transition-all duration-200",
                    status === 'blocking' ? "border-red-300 bg-red-50/30" :
                        status === 'attention' ? "border-orange-300 bg-orange-50/30" :
                            "border-gray-300",
                    !showBriefing && "cursor-pointer hover:shadow-md",
                    !showBriefing && status === 'blocking' && "hover:border-red-400",
                    !showBriefing && status === 'attention' && "hover:border-orange-400",
                    !showBriefing && status === 'ok' && "hover:border-indigo-400"
                )}
                onClick={() => !showBriefing && handleFieldEdit(fieldName)}
            >
                {!showBriefing && (
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Edit2 className="h-4 w-4 text-indigo-500" />
                    </div>
                )}

                {/* Status Indicator */}
                {status !== 'ok' && !showBriefing && (
                    <div className={cn(
                        "absolute -top-2 -right-2 p-1 rounded-full shadow-sm border",
                        status === 'blocking' ? "bg-red-100 border-red-200 text-red-600" : "bg-orange-100 border-orange-200 text-orange-600"
                    )}>
                        <AlertCircle className="h-3 w-3" />
                    </div>
                )}

                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-2">
                            {label}
                            {status === 'blocking' && <span className="text-[10px] text-red-600 font-bold">Obrigatório</span>}
                            {status === 'attention' && <span className="text-[10px] text-orange-600 font-bold">Futuro</span>}
                        </p>
                        <div className="text-sm font-semibold text-gray-900 truncate">
                            {value || (
                                status === 'blocking' ? <span className="text-red-500 italic font-medium">Obrigatório</span> :
                                    <span className="text-gray-400 italic font-normal">Não informado</span>
                            )}
                        </div>
                        {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn(
            "rounded-xl border shadow-sm transition-colors duration-300",
            showBriefing
                ? "border-amber-200 bg-amber-50"
                : "border-gray-300 bg-gradient-to-br from-white via-gray-50/50 to-indigo-50/30"
        )}>
            <div className="mb-4 p-5 pb-0 flex items-center justify-between">
                <div>
                    <h3 className={cn("text-base font-semibold flex items-center gap-2", showBriefing ? "text-amber-900" : "text-gray-900")}>
                        <div className={cn("p-1.5 rounded-lg", showBriefing ? "bg-amber-100" : "bg-indigo-100")}>
                            {showBriefing ? <History className="h-4 w-4 text-amber-600" /> : <Tag className="h-4 w-4 text-indigo-600" />}
                        </div>
                        {showBriefing ? "Briefing Inicial (Snapshot)" : "Informações da Viagem"}
                    </h3>
                    <p className={cn("text-xs mt-1 ml-8", showBriefing ? "text-amber-700 font-medium" : "text-gray-500")}>
                        {showBriefing ? "Visualizando o desejo original do cliente (Imutável)" : "Clique em um campo para editar"}
                    </p>
                </div>
                <button
                    onClick={() => setShowBriefing(!showBriefing)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border",
                        showBriefing
                            ? "bg-white text-amber-900 border-amber-200 hover:bg-amber-50"
                            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    )}
                >
                    <History className="h-3.5 w-3.5" />
                    {showBriefing ? "Voltar ao Atual" : "Ver Original"}
                </button>
            </div>

            <div className="p-5 pt-0">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Motivo */}
                    <FieldCard
                        icon={Tag}
                        iconColor="bg-purple-100 text-purple-600"
                        label="Motivo da Viagem"
                        value={displayData.motivo}
                        fieldName="motivo"
                        dataKey="motivo"
                    />

                    {/* Destinos */}
                    <FieldCard
                        icon={MapPin}
                        iconColor="bg-blue-100 text-blue-600"
                        label="Destino(s)"
                        value={displayData.destinos?.length ? displayData.destinos.join(' • ') : undefined}
                        fieldName="destinos"
                        dataKey="destinos"
                    />

                    {/* Período */}
                    <FieldCard
                        icon={Calendar}
                        iconColor="bg-orange-100 text-orange-600"
                        label="Período da Viagem"
                        value={displayData.epoca_viagem?.inicio ? (
                            <>
                                {formatDate(displayData.epoca_viagem.inicio)}
                                {displayData.epoca_viagem.fim && ` até ${formatDate(displayData.epoca_viagem.fim)}`}
                            </>
                        ) : undefined}
                        subValue={displayData.epoca_viagem?.flexivel ? '📌 Datas flexíveis' : undefined}
                        fieldName="periodo"
                        dataKey="epoca_viagem"
                    />

                    {/* Orçamento */}
                    <FieldCard
                        icon={DollarSign}
                        iconColor="bg-green-100 text-green-600"
                        label="Orçamento"
                        value={displayData.orcamento?.total ? formatBudget(displayData.orcamento.total) : undefined}
                        subValue={displayData.orcamento?.por_pessoa ? `${formatBudget(displayData.orcamento.por_pessoa)} por pessoa` : undefined}
                        fieldName="orcamento"
                        dataKey="orcamento"
                    />

                    {/* Origem do Lead */}
                    <FieldCard
                        icon={TrendingUp}
                        iconColor="bg-cyan-100 text-cyan-600"
                        label="Origem do Lead"
                        value={(displayData as any).origem_lead}
                        fieldName="origem"
                        dataKey="origem_lead"
                    />
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
                        {/* Preview tags */}

                    </div>
                </EditModal>

                {/* Modal: Período */}
                <EditModal
                    isOpen={editingField === 'periodo'}
                    onClose={handleCloseModal}
                    onSave={handleFieldSave}
                    title="Período da Viagem"
                    isSaving={updateCardMutation.isPending}
                >
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Data de Ida
                                </label>
                                <input
                                    type="date"
                                    value={editedData.epoca_viagem?.inicio || ''}
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
                                    value={editedData.epoca_viagem?.fim || ''}
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
            </div>
        </div>
    )
}
