import { Plus } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import { calculateAge } from '../../lib/contactUtils'
import { useState } from 'react'
import ContactSelector from './ContactSelector'
import CardTravelers from './CardTravelers'
import TravelHistorySection from './TravelHistorySection'

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
    console.log('PessoasWidget card:', card.id, 'principal:', card.pessoa_principal_id)
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

    // Fetch travelers (linked contacts) for summary counts
    const { data: travelers } = useQuery({
        queryKey: ['card-travelers-summary', card.id], // CHANGED: Unique key to avoid conflict with CardTravelers
        queryFn: async () => {
            const { data, error } = await (supabase.from('cards_contatos') as any)
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
                    const { count } = await (supabase.from('cards_contatos') as any)
                        .select('*', { count: 'exact', head: true })
                        .eq('contato_id', contato.id)
                        .neq('card_id', card.id)

                    return {
                        id: contato.id,
                        nome: contato.nome,
                        idade: contato.data_nascimento ? calculateAge(contato.data_nascimento) : null,
                        tipo: contato.tipo_pessoa || 'adulto', // Default to adulto if missing
                        viagens_anteriores: count || 0,
                        tipo_viajante: 'acompanhante'
                    } as Traveler
                })
            )

            const result = mappedTravelers.filter(Boolean) as Traveler[]
            return result
        },
        enabled: !!card.id
    })

    const adultos = travelers?.filter(t => t.tipo === 'adulto').length || 0
    const criancas = travelers?.filter(t => t.tipo === 'crianca').length || 0

    const handleContactAdded = () => {
        queryClient.invalidateQueries({ queryKey: ['card-travelers-summary', card.id] })
        queryClient.invalidateQueries({ queryKey: ['card-contacts', card.id] }) // Keep this for other components if needed
    }

    const handleSetPrimaryContact = async (contactId: string) => {
        const { error } = await (supabase.from('cards') as any)
            .update({ pessoa_principal_id: contactId })
            .eq('id', card.id)

        if (error) {
            alert('Erro ao definir contato principal')
            return
        }

        queryClient.invalidateQueries({ queryKey: ['card', card.id] })
        queryClient.invalidateQueries({ queryKey: ['contact', contactId] })
        queryClient.invalidateQueries({ queryKey: ['card-contacts', card.id] })
        setShowSelector(false)
    }

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Pessoas</h3>

            <div className="space-y-4">
                {/* Primary Contact */}
                {contact ? (
                    <div className="group relative bg-gray-50 rounded-lg p-3 border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-indigo-600 font-semibold shadow-sm">
                                    {contact.nome?.charAt(0).toUpperCase() || 'C'}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{contact.nome}</p>
                                    <p className="text-xs text-gray-500">Contato Principal</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setShowSelector(true)}
                                    className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-md hover:bg-white transition-colors"
                                    title="Trocar contato principal"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-arrow-left-right"><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></svg>
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm('Remover contato principal?')) {
                                            const result = await (supabase.from('cards') as any)
                                                .update({ pessoa_principal_id: null })
                                                .eq('id', card.id)
                                                .select()

                                            if (result.error) {
                                                alert('Erro ao remover contato: ' + result.error.message)
                                            } else {
                                                queryClient.setQueryData(['card', card.id], (old: any) => {
                                                    if (!old) return old
                                                    return { ...old, pessoa_principal_id: null, pessoa_principal_nome: null }
                                                })
                                                queryClient.invalidateQueries({ queryKey: ['card', card.id] })
                                                if (card.pessoa_principal_id) {
                                                    queryClient.invalidateQueries({ queryKey: ['contact', card.pessoa_principal_id] })
                                                }
                                            }
                                        }
                                    }}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-md hover:bg-white transition-colors"
                                    title="Remover contato principal"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowSelector(true)}
                        className="w-full flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group"
                    >
                        <div className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center mb-2 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <Plus className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-600 group-hover:text-indigo-700">Definir Contato Principal</p>
                        <p className="text-xs text-gray-400 group-hover:text-indigo-500/70">Quem negocia/paga pela viagem</p>
                    </button>
                )}

                {/* Travelers - Only for TRIPS */}
                {card.produto === 'TRIPS' && (
                    <>
                        <div className="pt-3 border-t">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold text-gray-500 uppercase">
                                    Acompanhantes ({adultos} {adultos === 1 ? 'adulto' : 'adultos'}, {criancas} {criancas === 1 ? 'criança' : 'crianças'})
                                </p>
                                <button
                                    onClick={() => setShowSelector(true)}
                                    className="text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 transition-colors"
                                >
                                    <Plus className="h-3 w-3" />
                                    Adicionar
                                </button>
                            </div>

                            <div className="space-y-2 mb-4">
                                <CardTravelers
                                    card={card as any}
                                    embedded={true}
                                // Removed onTravelerClick as TravelHistoryModal is no longer used for individual travelers
                                />
                            </div>
                        </div>

                        {/* Travel History Section */}
                        <div className="pt-3 border-t">
                            <TravelHistorySection
                                travelers={[
                                    ...(contact ? [{ id: contact.id, nome: contact.nome }] : []),
                                    ...(travelers || []).map(t => ({ id: t.id, nome: t.nome }))
                                ]}
                            />
                        </div>
                    </>
                )}
            </div>

            {showSelector && card.id && (
                <ContactSelector
                    cardId={card.id}
                    onClose={() => setShowSelector(false)}
                    addToCard={!!contact} // If contact exists (adding traveler), add to card. If not (setting primary), don't add to card.
                    onContactAdded={(contactId) => {
                        if (contact) {
                            handleContactAdded()
                        } else {
                            if (contactId) {
                                handleSetPrimaryContact(contactId)
                            }
                        }
                    }}
                />
            )}
        </div>
    )
}
