import { useState, useEffect } from 'react'
import { MapPin, Calendar, DollarSign, Tag, TrendingUp } from 'lucide-react'
import type { Database, TripsProdutoData } from '../../database.types'
import { supabase } from '../../lib/supabase'
import { useMutation, useQueryClient } from '@tanstack/react-query'
// import PessoasField from '../pipeline/fields/PessoasField'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface TripInformationProps {
    card: Card
}



export default function TripInformation({ card }: TripInformationProps) {
    const productData = (card.produto_data as TripsProdutoData) || {}

    const [editingField, setEditingField] = useState<string | null>(null)
    const [editedData, setEditedData] = useState<TripsProdutoData>(productData)
    const queryClient = useQueryClient()

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const { data, error } = await (supabase.from('view_cards_contatos_summary') as any)
                    .select('total_viajantes, total_adultos, total_criancas')
                    .eq('card_id', card.id)
                    .single()

                if (error && error.code !== 'PGRST116') throw error

                if (data) {

                }
            } catch (error) {
                console.error('Error fetching travelers summary:', error)
            }
        }

        fetchSummary()
    }, [card.id])

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
        }
    })

    const handleFieldSave = () => {
        updateCardMutation.mutate(editedData)
        setEditingField(null)
    }

    const handleFieldEdit = (fieldName: string) => {
        setEditingField(fieldName)
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



    return (
        <div className="rounded-lg border bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm">
            <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-indigo-600" />
                    Informações Essenciais da Viagem
                </h3>
                <p className="text-xs text-gray-500 mt-1">Clique em um campo para editar</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                {/* Motivo */}
                <div
                    className="p-3 bg-white rounded-md border cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => editingField !== 'motivo' && handleFieldEdit('motivo')}
                >
                    <p className="text-xs text-gray-500 mb-1">Motivo da Viagem</p>
                    {editingField === 'motivo' ? (
                        <input
                            type="text"
                            value={editedData.motivo || ''}
                            onChange={(e) => setEditedData({ ...editedData, motivo: e.target.value })}
                            onBlur={handleFieldSave}
                            autoFocus
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Ex: Lua de Mel, Férias em Família..."
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <p className="text-sm font-semibold text-gray-900">{productData.motivo || '-'}</p>
                    )}
                </div>

                {/* Destinos */}
                <div
                    className="p-3 bg-white rounded-md border cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => editingField !== 'destinos' && handleFieldEdit('destinos')}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                        <p className="text-xs text-gray-500">Destino(s)</p>
                    </div>
                    {editingField === 'destinos' ? (
                        <input
                            type="text"
                            value={editedData.destinos?.join(', ') || ''}
                            onChange={(e) => setEditedData({ ...editedData, destinos: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                            onBlur={handleFieldSave}
                            autoFocus
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Separe por vírgulas"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <p className="text-sm font-semibold text-gray-900">
                            {productData.destinos && productData.destinos.length > 0 ? productData.destinos.join(' • ') : '-'}
                        </p>
                    )}
                </div>

                {/* Período */}
                <div
                    className="p-3 bg-white rounded-md border cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => editingField !== 'periodo' && handleFieldEdit('periodo')}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                        <p className="text-xs text-gray-500">Período</p>
                    </div>
                    {editingField === 'periodo' ? (
                        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="date"
                                value={editedData.epoca_viagem?.inicio || ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    epoca_viagem: { ...editedData.epoca_viagem, inicio: e.target.value, fim: editedData.epoca_viagem?.fim || '', flexivel: editedData.epoca_viagem?.flexivel || false }
                                })}
                                onBlur={handleFieldSave}
                                autoFocus
                                className="w-full text-xs border-gray-300 rounded-md"
                            />
                            <input
                                type="date"
                                value={editedData.epoca_viagem?.fim || ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    epoca_viagem: { ...editedData.epoca_viagem, inicio: editedData.epoca_viagem?.inicio || '', fim: e.target.value, flexivel: editedData.epoca_viagem?.flexivel || false }
                                })}
                                onBlur={handleFieldSave}
                                className="w-full text-xs border-gray-300 rounded-md"
                            />
                        </div>
                    ) : (
                        <p className="text-sm font-semibold text-gray-900">
                            {productData.epoca_viagem?.inicio ? (
                                <>
                                    {formatDate(productData.epoca_viagem.inicio)}
                                    {productData.epoca_viagem.fim && (
                                        <> até {formatDate(productData.epoca_viagem.fim)}</>
                                    )}
                                </>
                            ) : '-'}
                        </p>
                    )}
                </div>

                {/* Orçamento */}
                <div
                    className="p-3 bg-white rounded-md border cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => editingField !== 'orcamento' && handleFieldEdit('orcamento')}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-3.5 w-3.5 text-green-600" />
                        <p className="text-xs text-gray-500">Orçamento</p>
                    </div>
                    {editingField === 'orcamento' ? (
                        <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="number"
                                placeholder="Total"
                                value={editedData.orcamento?.total || ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    orcamento: { ...editedData.orcamento, total: parseFloat(e.target.value) || 0, por_pessoa: editedData.orcamento?.por_pessoa || 0 }
                                })}
                                onBlur={handleFieldSave}
                                autoFocus
                                className="w-full text-xs border-gray-300 rounded-md"
                            />
                            <input
                                type="number"
                                placeholder="Por Pessoa"
                                value={editedData.orcamento?.por_pessoa || ''}
                                onChange={(e) => setEditedData({
                                    ...editedData,
                                    orcamento: { ...editedData.orcamento, total: editedData.orcamento?.total || 0, por_pessoa: parseFloat(e.target.value) || 0 }
                                })}
                                onBlur={handleFieldSave}
                                className="w-full text-xs border-gray-300 rounded-md"
                            />
                        </div>
                    ) : (
                        <>
                            <p className="text-sm font-semibold text-gray-900">
                                {productData.orcamento?.total ? formatBudget(productData.orcamento.total) : '-'}
                            </p>
                            {productData.orcamento?.por_pessoa && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                    {formatBudget(productData.orcamento.por_pessoa)} por pessoa
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Origem do Lead */}
                <div
                    className="p-3 bg-white rounded-md border cursor-pointer hover:border-indigo-300 transition-colors"
                    onClick={() => editingField !== 'origem' && handleFieldEdit('origem')}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                        <p className="text-xs text-gray-500">Origem do Lead</p>
                    </div>
                    {editingField === 'origem' ? (
                        <input
                            type="text"
                            value={(editedData as any).origem_lead || ''}
                            onChange={(e) => setEditedData({ ...editedData, origem_lead: e.target.value } as any)}
                            onBlur={handleFieldSave}
                            autoFocus
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <p className="text-sm font-semibold text-gray-900">
                            {(productData as any).origem_lead || '-'}
                        </p>
                    )}
                </div>

                {/* Cliente Recorrente */}
                {card.cliente_recorrente && (
                    <div className="p-2 bg-indigo-50 border border-indigo-200 rounded-md">
                        <p className="text-xs font-medium text-indigo-700">
                            ⭐ Cliente Recorrente - Já viajou com a Welcome antes
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
