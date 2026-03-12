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
            // 1. Find contato by conversation_id
            const { data: contato, error: contatoError } = await supabase
                .from('contatos')
                .select('id')
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

            // 2. Find most recent card via cards_contatos junction table
            const { data: cardLink, error: cardError } = await supabase
                .from('cards_contatos')
                .select('card_id, cards!cards_contatos_card_id_fkey(created_at)')
                .eq('contato_id', contato.id)
                .order('created_at', { ascending: false, referencedTable: 'cards' })
                .limit(1)
                .maybeSingle()

            if (cardError) {
                console.error('Erro ao buscar card:', cardError)
                setError('Erro ao buscar card')
                return
            }

            if (!cardLink) {
                setError('Nenhum card encontrado para esse contato')
                return
            }

            // Redirect to card detail
            navigate(`/cards/${cardLink.card_id}`, { replace: true })
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
