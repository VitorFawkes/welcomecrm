import { useState, useEffect } from 'react'
import { Users, User, Loader2 } from 'lucide-react'
import type { Database, TripsProdutoData, Contato } from '../../database.types'
import { supabase } from '../../lib/supabase'
import { calculateAge } from '../../lib/contactUtils'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface CardTravelersProps {
    card: Card
}

interface CardContatoWithDetails {
    id: string
    tipo_viajante: 'titular' | 'acompanhante'
    contato: Contato
}

export default function CardTravelers({ card }: CardTravelersProps) {
    const productData = (card.produto_data as TripsProdutoData) || {}
    const pessoas = productData.pessoas
    const [contacts, setContacts] = useState<CardContatoWithDetails[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchContacts = async () => {
            try {
                const { data, error } = await supabase
                    .from('cards_contatos')
                    .select(`
                        id,
                        tipo_viajante,
                        contato:contatos (*)
                    `)
                    .eq('card_id', card.id)
                    .order('ordem')

                if (error) throw error

                // Cast to correct type since Supabase returns array of objects
                const mapped = (data || []).map(item => ({
                    id: item.id,
                    tipo_viajante: item.tipo_viajante,
                    contato: item.contato as unknown as Contato
                }))

                setContacts(mapped)
            } catch (error) {
                console.error('Error fetching travelers:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchContacts()
    }, [card.id])

    if (loading) {
        return (
            <div className="rounded-lg border bg-white p-4 shadow-sm flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
        )
    }

    // If we have detailed contacts, show them
    if (contacts.length > 0) {
        const adults = contacts.filter(c => c.contato.tipo_pessoa === 'adulto')
        const children = contacts.filter(c => c.contato.tipo_pessoa === 'crianca')

        return (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Viajantes ({contacts.length})</h3>
                </div>

                <div className="space-y-3">
                    {contacts.map(({ id, tipo_viajante, contato }) => (
                        <div key={id} className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium shrink-0">
                                {contato.nome.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-900 truncate">{contato.nome}</p>
                                    {tipo_viajante === 'titular' && (
                                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-medium">
                                            Titular
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <span>{contato.tipo_pessoa === 'adulto' ? 'Adulto' : 'Criança'}</span>
                                    {contato.data_nascimento && (
                                        <span>• {calculateAge(contato.data_nascimento)} anos</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-xs text-gray-500 block">Adultos</span>
                            <span className="text-sm font-semibold text-gray-900">{adults.length}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 block">Crianças</span>
                            <span className="text-sm font-semibold text-gray-900">{children.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // Fallback to legacy view
    if (!pessoas) return null

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Users className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Viajantes</h3>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Adultos</span>
                    <span className="text-sm font-semibold text-gray-900">{pessoas.adultos}</span>
                </div>

                {pessoas.criancas && pessoas.criancas > 0 && (
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600">Crianças</span>
                        <span className="text-sm font-semibold text-gray-900">{pessoas.criancas}</span>
                    </div>
                )}

                {pessoas.idades_criancas && pessoas.idades_criancas.length > 0 && (
                    <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-gray-600 block mb-1">Idades das crianças</span>
                        <div className="flex flex-wrap gap-1">
                            {pessoas.idades_criancas.map((idade, idx) => (
                                <span
                                    key={idx}
                                    className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium"
                                >
                                    {idade} {idade === 1 ? 'ano' : 'anos'}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-3 pt-3 border-t">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">Total de passageiros</span>
                        <span className="text-base font-bold text-indigo-600">
                            {pessoas.adultos + (pessoas.criancas || 0)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
