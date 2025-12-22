import { useState, useEffect } from 'react'
import { Search, Plus, UserPlus, Loader2, AlertCircle } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'

interface ContactSelectorProps {
    cardId: string
    onClose: () => void
    onContactAdded: (contactId?: string, contact?: { nome: string }) => void
    addToCard?: boolean
}

export default function ContactSelector({ cardId, onClose, onContactAdded, addToCard = true }: ContactSelectorProps) {
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [newContact, setNewContact] = useState({
        nome: '',
        email: '',
        telefone: '',
        // whatsapp: '', // Removed from form, keeping state clean
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
            setError(null)
            // Prepare payload, converting empty strings to null for optional fields
            const payload = {
                nome: newContact.nome,
                email: newContact.email.trim() || null,
                telefone: newContact.telefone.trim() || null,
                tipo_pessoa: newContact.tipo_pessoa
            }

            const { data, error } = await (supabase.from('contatos') as any)
                .insert(payload)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: async (createdContact) => {
            try {
                if (cardId && addToCard) {
                    // Check if already linked to avoid duplicates
                    const { data: existingLink } = await (supabase.from('cards_contatos') as any)
                        .select('id')
                        .eq('card_id', cardId)
                        .eq('contato_id', createdContact.id)
                        .single()

                    if (!existingLink) {
                        const { data: existing } = await (supabase.from('cards_contatos') as any)
                            .select('ordem')
                            .eq('card_id', cardId)
                            .order('ordem', { ascending: false })
                            .limit(1)

                        const nextOrder = (existing?.[0]?.ordem || 0) + 1

                        const { error: linkError } = await (supabase.from('cards_contatos') as any)
                            .insert({
                                card_id: cardId,
                                contato_id: createdContact.id,
                                tipo_viajante: 'acompanhante',
                                ordem: nextOrder
                            })

                        if (linkError) throw linkError
                    }
                }

                onContactAdded(createdContact.id, createdContact)
                onClose() // Close modal on success
            } catch (err: any) {
                console.error('Error linking contact:', err)
                setError('Contato criado, mas houve um erro ao vincular: ' + err.message)
            }
        },
        onError: (err: any) => {
            console.error('Error creating contact:', err)
            setError('Erro ao criar contato: ' + err.message)
        }
    })

    // Add contact to card
    const addContactMutation = useMutation({
        mutationFn: async (contactId: string) => {
            setError(null)
            if (!cardId || !addToCard) return contactId

            // Check if already linked
            const { data: existingLink } = await (supabase.from('cards_contatos') as any)
                .select('id')
                .eq('card_id', cardId)
                .eq('contato_id', contactId)
                .single()

            if (existingLink) return contactId

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
                .select()

            if (error) {
                if (error.code === '23505') return contactId
                throw error
            }
            return contactId
        },
        onSuccess: (contactId, _variables) => {
            // We need the contact name for the callback. 
            // Since we don't have it in the mutation result (it just returns ID), 
            // we rely on the fact that we selected it from the list.
            // But wait, the mutationFn argument is just the ID.
            // We need to find the contact in the 'contacts' list to get the name.
            const contact = contacts?.find(c => c.id === contactId)
            onContactAdded(contactId, contact)
            onClose()
        },
        onError: (err: any) => {
            setError('Erro ao adicionar contato: ' + err.message)
        }
    })

    const handleCreateContact = () => {
        if (!newContact.nome.trim()) {
            setError('Nome é obrigatório')
            return
        }
        createContactMutation.mutate()
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0">
                <div className="p-6 pb-4 border-b border-gray-100">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            {showCreateForm ? 'Novo Contato' : 'Selecionar Contato'}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-md flex items-start gap-2 text-sm text-red-700">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {!showCreateForm ? (
                        <div className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nome..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="min-h-[200px] max-h-[300px] overflow-y-auto -mx-2 px-2 space-y-1">
                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                        <Loader2 className="h-6 w-6 animate-spin mb-2" />
                                        <span className="text-sm">Buscando contatos...</span>
                                    </div>
                                ) : contacts?.length ? (
                                    contacts.map((contact) => (
                                        <button
                                            key={contact.id}
                                            onClick={() => addContactMutation.mutate(contact.id)}
                                            disabled={addContactMutation.isPending}
                                            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg group transition-colors text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-medium group-hover:bg-indigo-100 transition-colors">
                                                    {contact.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-gray-900 truncate">{contact.nome}</p>
                                                    <p className="text-xs text-gray-500 truncate">{contact.email || 'Sem email'}</p>
                                                </div>
                                            </div>
                                            {addContactMutation.isPending ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                                            ) : (
                                                <Plus className="h-4 w-4 text-gray-400 group-hover:text-indigo-600" />
                                            )}
                                        </button>
                                    ))
                                ) : debouncedSearch.length > 2 ? (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-gray-500 mb-3">Nenhum contato encontrado</p>
                                        <Button
                                            onClick={() => {
                                                setShowCreateForm(true)
                                                setNewContact(prev => ({ ...prev, nome: searchTerm }))
                                            }}
                                            variant="outline"
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                        >
                                            <UserPlus className="h-4 w-4 mr-2" />
                                            Criar "{searchTerm}"
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-gray-400">
                                        <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">Digite para buscar ou crie um novo contato</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <Button
                                    onClick={() => setShowCreateForm(true)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Criar Novo Contato
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Nome Completo <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newContact.nome}
                                    onChange={(e) => setNewContact({ ...newContact, nome: e.target.value })}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                    placeholder="Ex: João Silva"
                                    autoFocus
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                    <input
                                        type="email"
                                        value={newContact.email}
                                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="joao@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                                    <input
                                        type="tel"
                                        value={newContact.telefone}
                                        onChange={(e) => setNewContact({ ...newContact, telefone: e.target.value })}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                        placeholder="(11) 99999-9999"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Pessoa</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo_pessoa"
                                            value="adulto"
                                            checked={newContact.tipo_pessoa === 'adulto'}
                                            onChange={() => setNewContact({ ...newContact, tipo_pessoa: 'adulto' })}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">Adulto</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="tipo_pessoa"
                                            value="crianca"
                                            checked={newContact.tipo_pessoa === 'crianca'}
                                            onChange={() => setNewContact({ ...newContact, tipo_pessoa: 'crianca' })}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">Criança</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 mt-2 border-t border-gray-100">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowCreateForm(false)
                                        setNewContact({ nome: '', email: '', telefone: '', tipo_pessoa: 'adulto' })
                                        setError(null)
                                    }}
                                    className="flex-1"
                                >
                                    Voltar
                                </Button>
                                <Button
                                    onClick={handleCreateContact}
                                    disabled={createContactMutation.isPending}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {createContactMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Salvando...
                                        </>
                                    ) : (
                                        'Criar e Adicionar'
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

