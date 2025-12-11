import { useState, useEffect } from 'react'
import { MapPin, Calendar, DollarSign, Tag, TrendingUp, X, Check, Edit2 } from 'lucide-react'
import type { Database, TripsProdutoData } from '../../database.types'
import { supabase } from '../../lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'

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
    const queryClient = useQueryClient()

    // Update editedData when card changes
    useEffect(() => {
        setEditedData((card.produto_data as TripsProdutoData) || {})
    }, [card.produto_data])

    const updateCardMutation = useMutation({
        mutationFn: async (newData: TripsProdutoData) => {
            const { error } = await (supabase.from('cards') as any)
                .update({ produto_data: newData })
                .eq('id', card.id!)

            if (error) throw error
        },
        onSuccess: () => {
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

    // Field Card Component
    const FieldCard = ({
        icon: Icon,
        iconColor,
        label,
        value,
        subValue,
        fieldName
    }: {
        icon: any
        iconColor: string
        label: string
        value: string | React.ReactNode
        subValue?: string
        fieldName: string
    }) => (
        <div
            className="group relative p-4 bg-white rounded-xl border border-gray-200 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all duration-200"
            onClick={() => handleFieldEdit(fieldName)}
        >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Edit2 className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                    <div className="text-sm font-semibold text-gray-900 truncate">{value || <span className="text-gray-400 italic font-normal">Não informado</span>}</div>
                    {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}
                </div>
            </div>
        </div>
    )

    return (
        <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-white via-gray-50/50 to-indigo-50/30 p-5 shadow-sm">
            <div className="mb-4">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Tag className="h-4 w-4 text-indigo-600" />
                    </div>
                    Informações da Viagem
                </h3>
                <p className="text-xs text-gray-500 mt-1 ml-8">Clique em um campo para editar</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Motivo */}
                <FieldCard
                    icon={Tag}
                    iconColor="bg-purple-100 text-purple-600"
                    label="Motivo da Viagem"
                    value={productData.motivo}
                    fieldName="motivo"
                />

                {/* Destinos */}
                <FieldCard
                    icon={MapPin}
                    iconColor="bg-blue-100 text-blue-600"
                    label="Destino(s)"
                    value={productData.destinos?.length ? productData.destinos.join(' • ') : undefined}
                    fieldName="destinos"
                />

                {/* Período */}
                <FieldCard
                    icon={Calendar}
                    iconColor="bg-orange-100 text-orange-600"
                    label="Período da Viagem"
                    value={productData.epoca_viagem?.inicio ? (
                        <>
                            {formatDate(productData.epoca_viagem.inicio)}
                            {productData.epoca_viagem.fim && ` até ${formatDate(productData.epoca_viagem.fim)}`}
                        </>
                    ) : undefined}
                    subValue={productData.epoca_viagem?.flexivel ? '📌 Datas flexíveis' : undefined}
                    fieldName="periodo"
                />

                {/* Orçamento */}
                <FieldCard
                    icon={DollarSign}
                    iconColor="bg-green-100 text-green-600"
                    label="Orçamento"
                    value={productData.orcamento?.total ? formatBudget(productData.orcamento.total) : undefined}
                    subValue={productData.orcamento?.por_pessoa ? `${formatBudget(productData.orcamento.por_pessoa)} por pessoa` : undefined}
                    fieldName="orcamento"
                />

                {/* Origem do Lead */}
                <FieldCard
                    icon={TrendingUp}
                    iconColor="bg-cyan-100 text-cyan-600"
                    label="Origem do Lead"
                    value={(productData as any).origem_lead}
                    fieldName="origem"
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
                    <textarea
                        value={editedData.destinos?.join('\n') || ''}
                        onChange={(e) => {
                            // Replace commas with newlines to allow comma-separated input
                            const value = e.target.value.replace(/,/g, '\n')
                            const lines = value.split('\n')
                            setEditedData({
                                ...editedData,
                                destinos: lines.filter(s => s.trim() !== '' || lines.length === 1 ? true : s.trim() !== '').map(s => s.trimStart())
                            })
                        }}
                        onBlur={(e) => {
                            // Clean up on blur
                            const cleaned = e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
                            setEditedData({ ...editedData, destinos: cleaned })
                        }}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none"
                        placeholder="Digite um destino por linha ou separe por vírgulas:
Paris, França
Roma, Itália
Tóquio, Japão"
                        rows={4}
                        autoFocus
                    />
                    <p className="text-xs text-gray-500">💡 Digite um destino por linha (Enter para nova linha)</p>
                    {/* Preview tags */}
                    {editedData.destinos && editedData.destinos.filter(d => d.trim()).length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {editedData.destinos.filter(d => d.trim()).map((dest, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-700 bg-indigo-100 rounded-full"
                                >
                                    <MapPin className="h-3 w-3" />
                                    {dest.trim()}
                                </span>
                            ))}
                        </div>
                    )}
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
    )
}
