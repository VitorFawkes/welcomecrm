import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../database.types'

type Contact = Database['public']['Tables']['contatos']['Row']

export function useCardContacts(cardId: string | undefined) {
    const queryClient = useQueryClient()

    // Fetch travelers (linked contacts)
    const { data: travelers, isLoading: isLoadingTravelers } = useQuery({
        queryKey: ['card-travelers', cardId],
        queryFn: async () => {
            if (!cardId) return []

            const { data, error } = await supabase
                .from('cards_contatos')
                .select(`
                    contato:contatos (*)
                `)
                .eq('card_id', cardId)
                .order('ordem')

            if (error) throw error

            // Map and filter valid contacts
            return (data || [])
                .map((item: any) => item.contato)
                .filter((c): c is Contact => !!c)
        },
        enabled: !!cardId
    })

    // Set Primary Contact Mutation
    const setPrimaryContactMutation = useMutation({
        mutationFn: async ({ contactId, contact }: { contactId: string, contact?: { nome: string } }) => {
            if (!cardId) throw new Error('Card ID is required')

            // 1. Update Card
            const { error: updateError } = await supabase
                .from('cards')
                .update({ pessoa_principal_id: contactId })
                .eq('id', cardId)

            if (updateError) throw updateError

            // 2. Remove from companions (cards_contatos) to avoid duplication
            const { error: deleteError } = await supabase
                .from('cards_contatos')
                .delete()
                .eq('card_id', cardId)
                .eq('contato_id', contactId)

            if (deleteError) throw deleteError

            return { contactId, contact }
        },
        onMutate: async ({ contactId, contact }) => {
            await queryClient.cancelQueries({ queryKey: ['card', cardId] })
            const previousCard = queryClient.getQueryData(['card', cardId])

            // Optimistic Update
            // Use provided contact name OR try to find in cache
            const contactsSearch = queryClient.getQueryData<any[]>(['contacts-search'])
            const cachedName = contactsSearch?.find(c => c.id === contactId)?.nome
            const optimisticName = contact?.nome || cachedName

            queryClient.setQueryData(['card', cardId], (old: any) => {
                if (!old) return old
                return {
                    ...old,
                    pessoa_principal_id: contactId,
                    pessoa_nome: optimisticName || old.pessoa_nome // Use found name or keep old
                }
            })

            return { previousCard }
        },
        onError: (err, _newContactId, context) => {
            console.error('Error setting primary contact:', err)
            if (context?.previousCard) {
                queryClient.setQueryData(['card', cardId], context.previousCard)
            }
            alert('Erro ao definir contato principal')
        },
        onSuccess: (_contactId) => {
            queryClient.invalidateQueries({ queryKey: ['card', cardId] })
            queryClient.invalidateQueries({ queryKey: ['card-travelers', cardId] })
            queryClient.invalidateQueries({ queryKey: ['card-travelers-summary', cardId] })
        }
    })

    // Remove Primary Contact Mutation
    const removePrimaryContactMutation = useMutation({
        mutationFn: async () => {
            if (!cardId) throw new Error('Card ID is required')

            const { error } = await supabase
                .from('cards')
                .update({ pessoa_principal_id: null })
                .eq('id', cardId)

            if (error) throw error
        },
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['card', cardId] })
            const previousCard = queryClient.getQueryData(['card', cardId])

            queryClient.setQueryData(['card', cardId], (old: any) => ({
                ...old,
                pessoa_principal_id: null,
                pessoa_nome: null
            }))

            return { previousCard }
        },
        onError: (err, _variables, context) => {
            console.error('Error removing primary contact:', err)
            if (context?.previousCard) {
                queryClient.setQueryData(['card', cardId], context.previousCard)
            }
            alert('Erro ao remover contato principal')
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', cardId] })
        }
    })

    return {
        travelers,
        isLoadingTravelers,
        setPrimaryContact: setPrimaryContactMutation.mutate,
        removePrimaryContact: removePrimaryContactMutation.mutate,
        isUpdating: setPrimaryContactMutation.isPending || removePrimaryContactMutation.isPending
    }
}
