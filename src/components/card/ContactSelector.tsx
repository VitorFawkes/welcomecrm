
import { useState, useEffect } from 'react'
import { Search, Plus, User, X, UserPlus, Check } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'

interface ContactSelectorProps {
    cardId: string
    onClose: () => void
    onContactAdded: () => void
}

export default function ContactSelector({ cardId, onClose, onContactAdded }: ContactSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newContact, setNewContact] = useState({
        nome: '',
        email: '',
        telefone: '',
        whatsapp: '',
        tipo_pessoa: 'adulto' as 'adulto' | 'crianca'
    })

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Search contacts
    const { data: contacts, isLoading } = useQuery({
        queryKey: ['contacts-search', debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch) return []

            const { data, error } = await (supabase.from('contatos') as any)
                .select('*')
                .ilike('nome', `%${debouncedSearch}%`)
                .limit(5)

            if (error) throw error
            return data as Database['public']['Tables']['contatos']['Row'][]
        },
        enabled: debouncedSearch.length > 2
    })

    // Create contact mutation
    const createContactMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await (supabase.from('contatos') as any)
                .insert(newContact)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: async (createdContact) => {
            // Add the newly created contact as a traveler
            const { data: existing } = await (supabase.from('cards_contatos') as any)
                .select('ordem')
                .eq('card_id', cardId)
                .order('ordem', { ascending: false })
                .limit(1)

            const nextOrder = (existing?.[0]?.ordem || 0) + 1

            await (supabase.from('cards_contatos') as any)
                .insert({
                    card_id: cardId,
                    contato_id: createdContact.id,
                    tipo_viajante: 'acompanhante',
                    ordem: nextOrder
                })

            onContactAdded()
            setShowCreateForm(false)
            setNewContact({ nome: '', email: '', telefone: '', whatsapp: '', tipo_pessoa: 'adulto' })
        }
    })

    // Add contact to card
    const addContactMutation = useMutation({
        mutationFn: async (contactId: string) => {
            // Get current max order
            const { data: existing } = await (supabase.from('cards_contatos') as any)
                .select('ordem')
                .eq('card_id', cardId)
                .order('ordem', { ascending: false })
                .limit(1)

            const nextOrder = (existing?.[0]?.ordem || 0) + 1

            const { error } = await (supabase.from('cards_contatos') as any)
                .insert({
                    card_id: cardId,
                    contato_id: contactId,
                    tipo_viajante: 'acompanhante',
                    ordem: nextOrder
                })

            if (error) throw error
        },
        onSuccess: () => {
            onContactAdded()
        }
    })

    const handleCreateContact = () => {
        if (!newContact.nome.trim()) return
        createContactMutation.mutate()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Adicionar Viajante</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {!showCreateForm ? (
                    <>
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors whitespace-nowrap"
                                title="Criar novo contato"
                            >
                                <UserPlus className="h-4 w-4" />
                                Criar
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {isLoading && <p className="text-center text-sm text-gray-500">Buscando...</p>}

                            {contacts?.map((contact) => (
                                <div key={contact.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-md border border-transparent hover:border-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-sm text-gray-900 truncate">{contact.nome}</p>
                                            <p className="text-xs text-gray-500 truncate">{contact.email || 'Sem email'}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => addContactMutation.mutate(contact.id)}
                                        disabled={addContactMutation.isPending}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50"
                                        title="Adicionar"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}

                            {debouncedSearch.length > 2 && contacts?.length === 0 && (
                                <p className="text-center text-sm text-gray-500 py-4">Nenhum contato encontrado com esse nome.</p>
                            )}

                            {debouncedSearch.length <= 2 && (
                                <p className="text-center text-sm text-gray-500 py-4">Digite pelo menos 3 letras para buscar.</p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nome <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={newContact.nome}
                                onChange={(e) => setNewContact({ ...newContact, nome: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Nome completo"
                                autoFocus
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={newContact.email}
                                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="email@exemplo.com"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                <input
                                    type="tel"
                                    value={newContact.telefone}
                                    onChange={(e) => setNewContact({ ...newContact, telefone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                                <input
                                    type="tel"
                                    value={newContact.whatsapp}
                                    onChange={(e) => setNewContact({ ...newContact, whatsapp: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                            <select
                                value={newContact.tipo_pessoa}
                                onChange={(e) => setNewContact({ ...newContact, tipo_pessoa: e.target.value as 'adulto' | 'crianca' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="adulto">Adulto</option>
                                <option value="crianca">Criança</option>
                            </select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleCreateContact}
                                disabled={!newContact.nome.trim() || createContactMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                            >
                                <Check className="h-4 w-4" />
                                {createContactMutation.isPending ? 'Criando...' : 'Criar e adicionar'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowCreateForm(false)
                                    setNewContact({ nome: '', email: '', telefone: '', whatsapp: '', tipo_pessoa: 'adulto' })
                                }}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors font-medium"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
