import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Check, X, Edit2 } from 'lucide-react'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface ObservacoesLivresProps {
    card: Card
}

export default function ObservacoesLivres({ card }: ObservacoesLivresProps) {
    const queryClient = useQueryClient()
    const productData = (card.produto_data as any) || {}
    const observacoes = (productData as any).observacoes || ''

    const [isEditing, setIsEditing] = useState(false)
    const [editedObs, setEditedObs] = useState(observacoes)

    // Sync state when card changes
    useEffect(() => {
        setEditedObs((card.produto_data as any)?.observacoes || '')
    }, [card.produto_data])

    const updateObsMutation = useMutation({
        mutationFn: async (newObs: string) => {
            const { error } = await (supabase.from('cards') as any)
                .update({
                    produto_data: {
                        ...productData,
                        observacoes: newObs
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

    const handleSave = useCallback(() => {
        updateObsMutation.mutate(editedObs)
    }, [editedObs, updateObsMutation])

    const handleCancel = () => {
        setEditedObs(observacoes)
        setIsEditing(false)
    }

    // Handle Enter to save (Shift+Enter for new line)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        }
        if (e.key === 'Escape') {
            handleCancel()
        }
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded-lg">
                        <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Observações</h3>
                </div>
                {!isEditing && observacoes && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Edit2 className="h-3.5 w-3.5 text-gray-500" />
                    </button>
                )}
            </div>

            {isEditing || !observacoes ? (
                <div className="space-y-3">
                    <textarea
                        value={editedObs}
                        onChange={(e) => setEditedObs(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-4 py-3 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-white"
                        placeholder="Observações gerais sobre o card, anotações do vendedor, etc..."
                        rows={4}
                        autoFocus={isEditing}
                    />
                    <p className="text-xs text-gray-400">💡 Enter para salvar, Shift+Enter para nova linha</p>

                    {(editedObs !== observacoes || isEditing) && (
                        <div className="flex gap-2">
                            <button
                                onClick={handleSave}
                                disabled={updateObsMutation.isPending || editedObs === observacoes}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                            >
                                <Check className="h-4 w-4" />
                                Salvar
                            </button>
                            <button
                                onClick={handleCancel}
                                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                <X className="h-4 w-4" />
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div
                    className="p-3 bg-gray-50 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setIsEditing(true)}
                >
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{observacoes}</p>
                </div>
            )}
        </div>
    )
}
