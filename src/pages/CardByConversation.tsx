import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

/**
 * Redirect page: /cards/convo/:conversationId
 * Looks up the card by Echo conversation ID and redirects to card detail.
 */
export default function CardByConversation() {
    const { conversationId } = useParams<{ conversationId: string }>()
    const navigate = useNavigate()
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!conversationId) {
            setError('ID da conversa não informado')
            return
        }

        async function findCard() {
            // Find contato with its most recent card via join
            const { data: contato, error: contatoError } = await supabase
                .from('contatos')
                .select('id, cards!cards_contato_id_fkey(id, created_at)')
                .eq('last_whatsapp_conversation_id', conversationId!)
                .maybeSingle()

            if (contatoError) {
                console.error('Erro ao buscar contato:', contatoError)
                setError('Erro ao buscar contato')
                return
            }

            if (!contato) {
                setError('Nenhum contato encontrado para essa conversa')
                return
            }

            // Get most recent card from the joined data
            const cards = contato.cards as Array<{ id: string; created_at: string }> | null
            if (!cards || cards.length === 0) {
                setError('Nenhum card encontrado para esse contato')
                return
            }

            // Sort by created_at desc and get first
            const mostRecent = cards.sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            )[0]

            // Redirect to card detail
            navigate(`/cards/${mostRecent.id}`, { replace: true })
        }

        findCard()
    }, [conversationId, navigate])

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <p className="text-slate-600">{error}</p>
                <button
                    onClick={() => navigate('/trips')}
                    className="text-indigo-600 hover:underline"
                >
                    Voltar para Cards
                </button>
            </div>
        )
    }

    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
    )
}
