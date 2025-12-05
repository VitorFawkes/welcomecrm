import { Phone, Mail, MessageSquare, User, UserPlus, UserMinus, Plus } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import { calculateAge } from '../../lib/contactUtils'
import { useState } from 'react'
import ContactSelector from './ContactSelector'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface PessoasWidgetProps {
    card: Card
}

interface Traveler {
    id: string // This is the contact ID
    nome: string
    idade: number | null
    tipo: 'adulto' | 'crianca'
    viagens_anteriores?: number
    tipo_viajante: 'titular' | 'acompanhante'
}

export default function PessoasWidget({ card }: PessoasWidgetProps) {
    const queryClient = useQueryClient()
    const [showSelector, setShowSelector] = useState(false)

    // Fetch primary contact
    const { data: contact } = useQuery({
        queryKey: ['contact', card.pessoa_principal_id],
        queryFn: async () => {
            if (!card.pessoa_principal_id) return null

            const { data, error } = await supabase
                .from('contatos')
                .select('*')
                .eq('id', card.pessoa_principal_id)
                .single()

            if (error) throw error
            return data as Database['public']['Tables']['contatos']['Row']
        },
        enabled: !!card.pessoa_principal_id
    })

    // Fetch travelers (linked contacts)
    const { data: travelers } = useQuery({
        queryKey: ['card-contacts', card.id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cards_contatos')
                .select(`
                    contato:contatos (*)
                `)
                .eq('card_id', card.id)
                .order('ordem')

            if (error) throw error

            const mappedTravelers = await Promise.all(
                ((data as any) || []).map(async (item: any) => {
                    const contato = item.contato
                    if (!contato) return null

                    // Check history
                    const { count } = await supabase
                        .from('cards_contatos')
                        .select('*', { count: 'exact', head: true })
                        .eq('contato_id', contato.id)
                        .neq('card_id', card.id)

                    return {
                        id: contato.id,
                        nome: contato.nome,
                        idade: contato.data_nascimento ? calculateAge(contato.data_nascimento) : null,
                        tipo: contato.tipo_pessoa,
                        viagens_anteriores: count || 0,
                        tipo_viajante: 'acompanhante' // Default for now, or fetch from item if needed
                    } as Traveler
                })
            )

            return mappedTravelers.filter(Boolean) as Traveler[]
        },
        enabled: !!card.id
    })

    const adultos = travelers?.filter(t => t.tipo === 'adulto').length || 0
    const criancas = travelers?.filter(t => t.tipo === 'crianca').length || 0

    // Check if primary contact is in travelers list
    const isContactTraveler = contact && travelers?.some(t => t.id === contact.id)

    // Mutation to toggle contact as traveler
    const toggleContactTravelerMutation = useMutation({
        mutationFn: async () => {
            if (!contact || !card.id) return

            if (isContactTraveler) {
                // Remove from travelers
                const { error } = await supabase
                    .from('cards_contatos')
                    .delete()
                    .eq('card_id', card.id)
                    .eq('contato_id', contact.id)

                if (error) throw error
            } else {
                // Add to travelers
                const { error } = await supabase
                    .from('cards_contatos')
                    .insert({
                        card_id: card.id,
                        contato_id: contact.id,
                        tipo_viajante: 'titular',
                        ordem: (travelers?.length || 0) + 1
                    })

                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-contacts', card.id] })
        }
    })

    const handleContactAdded = () => {
        queryClient.invalidateQueries({ queryKey: ['card-contacts', card.id] })
        // Keep selector open to add more? Or close? Let's close for now.
        // Actually ContactSelector might handle its own state, but we passed onClose.
        // Let's keep it open if user wants to add multiple, but usually one by one is safer.
        // setShowSelector(false) 
    }

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Pessoas</h3>

            <div className="space-y-4">
                {/* Primary Contact */}
                {contact && (
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase">Contato Principal</p>
                            <button
                                onClick={() => toggleContactTravelerMutation.mutate()}
                                disabled={toggleContactTravelerMutation.isPending}
                                className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border transition-colors ${isContactTraveler
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                    }`}
                                title={isContactTraveler ? "Remover da lista de viajantes" : "Incluir na lista de viajantes"}
                            >
                                {isContactTraveler ? (
                                    <>
                                        <UserMinus className="h-3 w-3" />
                                        É viajante
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-3 w-3" />
                                        Incluir como viajante
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                                    {contact.nome?.charAt(0) || 'C'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{contact.nome}</p>
                                    <p className="text-xs text-gray-500">Quem negocia/paga</p>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                {contact.telefone && (
                                    <a
                                        href={`tel:${contact.telefone}`}
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        <Phone className="h-3 w-3" />
                                        Ligar
                                    </a>
                                )}
                                {contact.whatsapp && (
                                    <a
                                        href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700"
                                    >
                                        <MessageSquare className="h-3 w-3" />
                                        WhatsApp
                                    </a>
                                )}
                                {contact.email && (
                                    <a
                                        href={`mailto:${contact.email}`}
                                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                                    >
                                        <Mail className="h-3 w-3" />
                                        Email
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Travelers */}
                <div className="pt-3 border-t">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">
                            Viajantes ({adultos} {adultos === 1 ? 'adulto' : 'adultos'}, {criancas} {criancas === 1 ? 'criança' : 'crianças'})
                        </p>
                        <button
                            onClick={() => setShowSelector(true)}
                            className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                            <Plus className="h-3 w-3" />
                            Adicionar
                        </button>
                    </div>

                    <div className="space-y-2">
                        {travelers && travelers.length > 0 ? (
                            travelers.map((traveler) => (
                                <div key={traveler.id} className="flex items-center gap-2 text-sm group">
                                    <User className="h-4 w-4 text-gray-400" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-900 truncate">
                                            {traveler.nome} {traveler.idade && `(${traveler.idade} anos)`}
                                        </p>
                                        {traveler.viagens_anteriores && traveler.viagens_anteriores > 0 && (
                                            <p className="text-xs text-indigo-600">
                                                ⭐ {traveler.viagens_anteriores} viagem(ns) anterior(es)
                                            </p>
                                        )}
                                    </div>
                                    {/* Could add remove button here if needed */}
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-gray-500 italic">Nenhum viajante adicionado</p>
                        )}
                    </div>
                </div>
            </div>

            {showSelector && card.id && (
                <ContactSelector
                    cardId={card.id}
                    onClose={() => setShowSelector(false)}
                    onContactAdded={handleContactAdded}
                />
            )}
        </div>
    )
}
