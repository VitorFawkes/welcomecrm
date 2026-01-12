import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
    Proposal,
    ProposalVersion,
    ProposalFull,
    ProposalSectionWithItems,
} from '@/types/proposals'

// ============================================
// Query Keys
// ============================================
export const proposalKeys = {
    all: ['proposals'] as const,
    lists: () => [...proposalKeys.all, 'list'] as const,
    listByCard: (cardId: string) => [...proposalKeys.lists(), { cardId }] as const,
    details: () => [...proposalKeys.all, 'detail'] as const,
    detail: (id: string) => [...proposalKeys.details(), id] as const,
    versions: (proposalId: string) => [...proposalKeys.all, 'versions', proposalId] as const,
    public: (token: string) => [...proposalKeys.all, 'public', token] as const,
}

// ============================================
// Fetch Proposals by Card
// ============================================
export function useProposalsByCard(cardId: string) {
    return useQuery({
        queryKey: proposalKeys.listByCard(cardId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('proposals')
                .select(`
          *,
          active_version:proposal_versions!fk_proposals_active_version(*)
        `)
                .eq('card_id', cardId)
                .order('created_at', { ascending: false })

            if (error) throw error
            return data as (Proposal & { active_version: ProposalVersion | null })[]
        },
        enabled: !!cardId,
    })
}

// ============================================
// Fetch Single Proposal with Full Data
// ============================================
export function useProposal(proposalId: string) {
    return useQuery({
        queryKey: proposalKeys.detail(proposalId),
        queryFn: async () => {
            // Fetch proposal with active version
            const { data: proposal, error: proposalError } = await supabase
                .from('proposals')
                .select(`
          *,
          active_version:proposal_versions!fk_proposals_active_version(*)
        `)
                .eq('id', proposalId)
                .single()

            if (proposalError) throw proposalError
            if (!proposal.active_version) return proposal as ProposalFull

            // Fetch sections with items and options
            const { data: sections, error: sectionsError } = await supabase
                .from('proposal_sections')
                .select(`
          *,
          items:proposal_items(
            *,
            options:proposal_options(*)
          )
        `)
                .eq('version_id', proposal.active_version.id)
                .order('ordem')

            if (sectionsError) throw sectionsError

            // Sort items by ordem within each section
            const sortedSections = sections.map(section => ({
                ...section,
                items: (section.items || []).sort((a, b) => a.ordem - b.ordem).map(item => ({
                    ...item,
                    options: (item.options || []).sort((a, b) => a.ordem - b.ordem)
                }))
            })) as ProposalSectionWithItems[]

            return {
                ...proposal,
                active_version: {
                    ...proposal.active_version,
                    sections: sortedSections
                }
            } as ProposalFull
        },
        enabled: !!proposalId,
    })
}

// ============================================
// Fetch Proposal Versions (History)
// ============================================
export function useProposalVersions(proposalId: string) {
    return useQuery({
        queryKey: proposalKeys.versions(proposalId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('proposal_versions')
                .select('*')
                .eq('proposal_id', proposalId)
                .order('version_number', { ascending: false })

            if (error) throw error
            return data as ProposalVersion[]
        },
        enabled: !!proposalId,
    })
}

// ============================================
// Fetch Public Proposal (for client view)
// ============================================
export function usePublicProposal(token: string) {
    return useQuery({
        queryKey: proposalKeys.public(token),
        queryFn: async () => {
            // Fetch proposal by public token
            const { data: proposal, error: proposalError } = await supabase
                .from('proposals')
                .select(`
          *,
          active_version:proposal_versions!fk_proposals_active_version(*)
        `)
                .eq('public_token', token)
                .single()

            if (proposalError) throw proposalError
            if (!proposal.active_version) return proposal as ProposalFull

            // Fetch sections with items and options
            const { data: sections, error: sectionsError } = await supabase
                .from('proposal_sections')
                .select(`
          *,
          items:proposal_items(
            *,
            options:proposal_options(*)
          )
        `)
                .eq('version_id', proposal.active_version.id)
                .eq('visible', true)
                .order('ordem')

            if (sectionsError) throw sectionsError

            const sortedSections = sections.map(section => ({
                ...section,
                items: (section.items || []).sort((a, b) => a.ordem - b.ordem).map(item => ({
                    ...item,
                    options: (item.options || []).sort((a, b) => a.ordem - b.ordem)
                }))
            })) as ProposalSectionWithItems[]

            return {
                ...proposal,
                active_version: {
                    ...proposal.active_version,
                    sections: sortedSections
                }
            } as ProposalFull
        },
        enabled: !!token,
    })
}

// ============================================
// Create Proposal
// ============================================
export function useCreateProposal() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ cardId, title }: { cardId: string; title: string }) => {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('User not authenticated')

            // Create proposal
            const { data: proposal, error: proposalError } = await supabase
                .from('proposals')
                .insert({
                    card_id: cardId,
                    created_by: user.id,
                    status: 'draft',
                })
                .select()
                .single()

            if (proposalError) throw proposalError

            // Create initial version
            const { data: version, error: versionError } = await supabase
                .from('proposal_versions')
                .insert({
                    proposal_id: proposal.id,
                    version_number: 1,
                    title,
                    created_by: user.id,
                    change_summary: 'Versão inicial',
                })
                .select()
                .single()

            if (versionError) throw versionError

            // Set active version
            const { error: updateError } = await supabase
                .from('proposals')
                .update({ active_version_id: version.id })
                .eq('id', proposal.id)

            if (updateError) throw updateError

            return { proposal, version }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: proposalKeys.listByCard(variables.cardId) })
        },
    })
}

// ============================================
// Update Proposal Status
// ============================================
export function useUpdateProposalStatus() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ proposalId, status }: { proposalId: string; status: Proposal['status'] }) => {
            const updates: Partial<Proposal> = { status }

            if (status === 'accepted') {
                updates.accepted_at = new Date().toISOString()
            }

            const { data, error } = await supabase
                .from('proposals')
                .update(updates)
                .eq('id', proposalId)
                .select()
                .single()

            if (error) throw error
            return data
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: proposalKeys.detail(data.id) })
            queryClient.invalidateQueries({ queryKey: proposalKeys.listByCard(data.card_id) })
        },
    })
}

// ============================================
// Delete Proposal (Draft only)
// ============================================
export function useDeleteProposal() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (proposalId: string) => {
            // First get the proposal to check status and get card_id
            const { data: proposal, error: fetchError } = await supabase
                .from('proposals')
                .select('id, status, card_id')
                .eq('id', proposalId)
                .single()

            if (fetchError) throw fetchError
            if (proposal.status !== 'draft') {
                throw new Error('Apenas propostas em rascunho podem ser excluídas')
            }

            const { error } = await supabase
                .from('proposals')
                .delete()
                .eq('id', proposalId)

            if (error) throw error
            return proposal
        },
        onSuccess: (proposal) => {
            queryClient.invalidateQueries({ queryKey: proposalKeys.listByCard(proposal.card_id) })
        },
    })
}
