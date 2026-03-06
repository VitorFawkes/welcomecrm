import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'
import { useProductContext } from '@/hooks/useProductContext'

export interface SearchResult {
    id: string
    type: 'card' | 'contact' | 'proposal'
    title: string
    subtitle?: string
    icon: string
    href: string
}

export function useGlobalSearch() {
    const [query, setQuery] = useState('')
    const [isOpen, setIsOpen] = useState(false)
    const navigate = useNavigate()
    const { currentProduct } = useProductContext()

    const { data: results = [], isLoading } = useQuery({
        queryKey: ['global-search', query, currentProduct],
        queryFn: async () => {
            if (!query || query.length < 2) return []

            const searchTerm = `%${query}%`
            const allResults: SearchResult[] = []

            // Search Cards (filtered by current product)
            const { data: cards } = await supabase
                .from('cards')
                .select('id, titulo, produto, status_comercial')
                .eq('produto', currentProduct)
                .ilike('titulo', searchTerm)
                .limit(5)

            if (cards) {
                cards.forEach(card => {
                    allResults.push({
                        id: card.id,
                        type: 'card',
                        title: card.titulo || 'Sem título',
                        subtitle: `${card.produto || 'Viagem'} • ${card.status_comercial || 'Em aberto'}`,
                        icon: '📋',
                        href: `/cards/${card.id}`,
                    })
                })
            }

            // Search Contacts (nome, sobrenome, email e telefone)
            // Multi-word: also match first word→nome AND rest→sobrenome
            const words = query.trim().split(/\s+/)
            let contactFilter = `nome.ilike.${searchTerm},sobrenome.ilike.${searchTerm},email.ilike.${searchTerm},telefone.ilike.${searchTerm}`
            if (words.length >= 2) {
                contactFilter += `,and(nome.ilike.%${words[0]}%,sobrenome.ilike.%${words.slice(1).join(' ')}%)`
            }

            const { data: contacts } = await supabase
                .from('contatos')
                .select('id, nome, sobrenome, email, telefone')
                .is('deleted_at', null)
                .or(contactFilter)
                .limit(5)

            if (contacts) {
                contacts.forEach(contact => {
                    const fullName = [contact.nome, contact.sobrenome].filter(Boolean).join(' ')
                    allResults.push({
                        id: contact.id,
                        type: 'contact',
                        title: fullName || 'Sem nome',
                        subtitle: contact.email || contact.telefone || '',
                        icon: '👤',
                        href: `/pessoas?search=${encodeURIComponent(fullName)}`,
                    })
                })
            }

            // Search Proposals (filtered by card's product)
            const { data: proposals } = await supabase
                .from('proposals')
                .select(`
                    id,
                    status,
                    active_version:proposal_versions!active_version_id(title),
                    card:cards!proposals_card_id_fkey(produto)
                `)
                .eq('cards.produto', currentProduct)
                .limit(5)

            if (proposals) {
                proposals.forEach(proposal => {
                    const version = proposal.active_version as { title: string } | null
                    const title = version?.title
                    if (title && title.toLowerCase().includes(query.toLowerCase())) {
                        allResults.push({
                            id: proposal.id,
                            type: 'proposal',
                            title: title,
                            subtitle: `Proposta • ${proposal.status}`,
                            icon: '📄',
                            href: `/proposals/${proposal.id}/edit`,
                        })
                    }
                })
            }

            return allResults
        },
        enabled: query.length >= 2,
        staleTime: 1000 * 30,
    })

    const open = useCallback(() => setIsOpen(true), [])
    const close = useCallback(() => {
        setIsOpen(false)
        setQuery('')
    }, [])

    const navigateTo = useCallback((href: string) => {
        close()
        navigate(href)
    }, [close, navigate])

    return {
        query,
        setQuery,
        results,
        isLoading,
        isOpen,
        open,
        close,
        navigateTo,
    }
}
