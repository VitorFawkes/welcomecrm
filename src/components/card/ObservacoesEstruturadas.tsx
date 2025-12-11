import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Heart, Shield, Check, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface ObservacoesEstruturadasProps {
    card: Card
}

export default function ObservacoesEstruturadas({ card }: ObservacoesEstruturadasProps) {
    const queryClient = useQueryClient()
    const productData = (card.produto_data as any) || {}
    const observacoes = (productData as any).observacoes_criticas || {
        o_que_e_importante: '',
        o_que_nao_pode_dar_errado: '',
        sensibilidades: ''
    }

    const [editedObs, setEditedObs] = useState(observacoes)
    const [lastSavedObs, setLastSavedObs] = useState(observacoes)

    // Sync state when card changes
    useEffect(() => {
        const obs = (card.produto_data as any)?.observacoes_criticas || {
            o_que_e_importante: '',
            o_que_nao_pode_dar_errado: '',
            sensibilidades: ''
        }
        setEditedObs(obs)
        setLastSavedObs(obs)
    }, [card.produto_data])

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
        onSuccess: (_, newObs) => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id!] })
            setLastSavedObs(newObs)
        }
    })

    const handleSave = useCallback(() => {
        // Only save if changed
        if (JSON.stringify(editedObs) !== JSON.stringify(lastSavedObs)) {
            updateObsMutation.mutate(editedObs)
        }
    }, [editedObs, lastSavedObs, updateObsMutation])

    // Handle Enter to save (Shift+Enter for new line)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSave()
        }
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Informações Importantes</h3>
                </div>
                {updateObsMutation.isPending ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Salvando...
                    </div>
                ) : updateObsMutation.isSuccess ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <Check className="h-3 w-3" />
                        Salvo
                    </div>
                ) : null}
            </div>

            <div className="space-y-4" onKeyDown={handleKeyDown}>
                <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                        <Heart className="h-3.5 w-3.5 text-red-500" />
                        O que é MUITO importante?
                    </label>
                    <textarea
                        value={editedObs.o_que_e_importante || ''}
                        onChange={(e) => setEditedObs({ ...editedObs, o_que_e_importante: e.target.value })}
                        onBlur={handleSave}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-red-50/30 focus:bg-white"
                        rows={2}
                        placeholder="Ex: Aniversário de casamento, primeira viagem internacional..."
                    />
                </div>

                <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                        <Shield className="h-3.5 w-3.5 text-orange-500" />
                        O que NÃO pode dar errado?
                    </label>
                    <textarea
                        value={editedObs.o_que_nao_pode_dar_errado || ''}
                        onChange={(e) => setEditedObs({ ...editedObs, o_que_nao_pode_dar_errado: e.target.value })}
                        onBlur={handleSave}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-orange-50/30 focus:bg-white"
                        rows={2}
                        placeholder="Ex: Não pode ter atraso de voo, hotel deve ter acessibilidade..."
                    />
                </div>

                <div>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                        Sensibilidades e preferências
                    </label>
                    <textarea
                        value={editedObs.sensibilidades || ''}
                        onChange={(e) => setEditedObs({ ...editedObs, sensibilidades: e.target.value })}
                        onBlur={handleSave}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-yellow-50/30 focus:bg-white"
                        rows={2}
                        placeholder="Ex: Medo de avião, não gosta de calor, vegetariano..."
                    />
                </div>
            </div>
        </div>
    )
}
