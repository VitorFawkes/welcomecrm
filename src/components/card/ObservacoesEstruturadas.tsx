import { useState } from 'react'
import { AlertTriangle, Heart, Shield, Edit2, Check, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface ObservacoesEstruturadasProps {
    card: Card
}

export default function ObservacoesEstruturadas({ card }: ObservacoesEstruturadasProps) {
    const queryClient = useQueryClient()
    const [isEditing, setIsEditing] = useState(true) // Always start in edit mode
    const productData = (card.produto_data as any) || {}
    const observacoes = (productData as any).observacoes_criticas || {
        o_que_e_importante: '',
        o_que_nao_pode_dar_errado: '',
        sensibilidades: ''
    }

    const [editedObs, setEditedObs] = useState(observacoes)

    const updateObsMutation = useMutation({
        mutationFn: async (newObs: typeof observacoes) => {
            const { error } = await (supabase.from('cards') as any)
                .update({
                    produto_data: {
                        ...productData,
                        observacoes_criticas: newObs
                    }
                })
                .eq('id', card.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id!] })
            setIsEditing(false)
        }
    })

    const handleSave = () => {
        updateObsMutation.mutate(editedObs)
    }

    const handleCancel = () => {
        setEditedObs(observacoes)
        setIsEditing(false)
    }

    const hasAnyObservation = observacoes.o_que_e_importante || observacoes.o_que_nao_pode_dar_errado || observacoes.sensibilidades

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Informações Importantes</h3>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 hover:bg-gray-100 rounded"
                    >
                        <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-3">
                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                            <Heart className="h-3.5 w-3.5 text-red-500" />
                            O que é MUITO importante?
                        </label>
                        <textarea
                            value={editedObs.o_que_e_importante || ''}
                            onChange={(e) => setEditedObs({ ...editedObs, o_que_e_importante: e.target.value })}
                            className="w-full text-sm border-gray-300 rounded-md"
                            rows={2}
                            placeholder="Ex: Aniversário de casamento, primeira viagem internacional..."
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                            <Shield className="h-3.5 w-3.5 text-orange-500" />
                            O que NÃO pode dar errado?
                        </label>
                        <textarea
                            value={editedObs.o_que_nao_pode_dar_errado || ''}
                            onChange={(e) => setEditedObs({ ...editedObs, o_que_nao_pode_dar_errado: e.target.value })}
                            className="w-full text-sm border-gray-300 rounded-md"
                            rows={2}
                            placeholder="Ex: Não pode ter atraso de voo, hotel deve ter acessibilidade..."
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                            Sensibilidades e preferências
                        </label>
                        <textarea
                            value={editedObs.sensibilidades || ''}
                            onChange={(e) => setEditedObs({ ...editedObs, sensibilidades: e.target.value })}
                            className="w-full text-sm border-gray-300 rounded-md"
                            rows={2}
                            placeholder="Ex: Medo de avião, não gosta de calor, vegetariano..."
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleSave}
                            disabled={updateObsMutation.isPending}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <Check className="h-3.5 w-3.5" />
                            Salvar
                        </button>
                        <button
                            onClick={handleCancel}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md text-sm hover:bg-gray-50"
                        >
                            <X className="h-3.5 w-3.5" />
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    {!hasAnyObservation ? (
                        <p className="text-xs text-gray-500 italic">Nenhuma observação registrada. Clique no lápis para adicionar.</p>
                    ) : (
                        <>
                            {observacoes.o_que_e_importante && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Heart className="h-3.5 w-3.5 text-red-500" />
                                        <span className="text-xs font-medium text-gray-700">O que é importante</span>
                                    </div>
                                    <p className="text-sm text-gray-900 pl-5">{observacoes.o_que_e_importante}</p>
                                </div>
                            )}

                            {observacoes.o_que_nao_pode_dar_errado && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <Shield className="h-3.5 w-3.5 text-orange-500" />
                                        <span className="text-xs font-medium text-gray-700">Não pode dar errado</span>
                                    </div>
                                    <p className="text-sm text-gray-900 pl-5">{observacoes.o_que_nao_pode_dar_errado}</p>
                                </div>
                            )}

                            {observacoes.sensibilidades && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                                        <span className="text-xs font-medium text-gray-700">Sensibilidades</span>
                                    </div>
                                    <p className="text-sm text-gray-900 pl-5">{observacoes.sensibilidades}</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
