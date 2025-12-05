import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Check, X } from 'lucide-react'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface ObservacoesLivresProps {
    card: Card
}

export default function ObservacoesLivres({ card }: ObservacoesLivresProps) {
    const queryClient = useQueryClient()
    const productData = (card.produto_data as any) || {}
    const observacoes = (productData as any).observacoes || ''

    const [editedObs, setEditedObs] = useState(observacoes)

    const updateObsMutation = useMutation({
        mutationFn: async (newObs: string) => {
            const { error } = await supabase
                .from('cards')
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
        }
    })

    const handleSave = () => {
        updateObsMutation.mutate(editedObs)
    }

    const handleCancel = () => {
        setEditedObs(observacoes)
    }

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Observações</h3>
            </div>

            <div className="space-y-3">
                <textarea
                    value={editedObs}
                    onChange={(e) => setEditedObs(e.target.value)}
                    className="w-full text-sm border-gray-300 rounded-md min-h-[100px]"
                    placeholder="Observações gerais sobre o card, anotações do vendedor, etc..."
                />

                {editedObs !== observacoes && (
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
                )}
            </div>
        </div>
    )
}
