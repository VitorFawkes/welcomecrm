import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Proposal, ProposalVersion, ProposalStatus } from '@/types/proposals'

// ============================================
// Types
// ============================================
export interface ProposalFilters {
    search?: string
    status?: ProposalStatus | null
    createdBy?: string | null
}

export interface ProposalWithRelations extends Proposal {
    active_version: Pick<ProposalVersion, 'id' | 'title' | 'version_number'> | null
    card: {
        id: string
        titulo: string
        pessoa_principal_id: string | null
    } | null
    creator: {
        id: string
        email: string | null
        nome: string | null
    } | null
}

export interface ProposalStats {
    total: number
    draft: number
    sent: number
    viewed: number
    in_progress: number
    accepted: number
    rejected: number
    expired: number
    conversionRate: number
}

// ============================================
// Query Keys
// ============================================
export const proposalsListKeys = {
    all: ['proposals', 'list'] as const,
    filtered: (filters: ProposalFilters) => [...proposalsListKeys.all, filters] as const,
    stats: () => ['proposals', 'stats'] as const,
}

// ============================================
// Fetch All Proposals (with filters)
// ============================================
export function useProposals(filters?: ProposalFilters) {
    return useQuery({
        queryKey: proposalsListKeys.filtered(filters || {}),
        queryFn: async () => {
            let query = supabase
                .from('proposals')
                .select(`
          *,
          active_version:proposal_versions!fk_proposals_active_version(id, title, version_number),
          card:cards!proposals_card_id_fkey(id, titulo, pessoa_principal_id),
          creator:profiles!proposals_created_by_fkey(id, email, nome)
        `)
                .order('created_at', { ascending: false })

            // Apply status filter
            if (filters?.status) {
                query = query.eq('status', filters.status)
            }

            // Apply creator filter (for admin filtering by consultant)
            if (filters?.createdBy) {
                query = query.eq('created_by', filters.createdBy)
            }

            const { data, error } = await query

            if (error) throw error

            // Client-side search filter (for title)
            let result = data as unknown as ProposalWithRelations[]

            if (filters?.search) {
                const searchLower = filters.search.toLowerCase()
                result = result.filter(p =>
                    p.active_version?.title?.toLowerCase().includes(searchLower) ||
                    p.card?.titulo?.toLowerCase().includes(searchLower)
                )
            }

            return result
        },
    })
}

// ============================================
// Fetch Proposal Stats
// ============================================
export function useProposalStats() {
    return useQuery({
        queryKey: proposalsListKeys.stats(),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('proposals')
                .select('status')

            if (error) throw error

            const stats: ProposalStats = {
                total: data.length,
                draft: 0,
                sent: 0,
                viewed: 0,
                in_progress: 0,
                accepted: 0,
                rejected: 0,
                expired: 0,
                conversionRate: 0,
            }

            data.forEach(p => {
                const status = p.status as keyof Omit<ProposalStats, 'total' | 'conversionRate'>
                if (status in stats) {
                    stats[status]++
                }
            })

            // Calculate conversion rate (accepted / sent or viewed)
            const sentOrViewed = stats.sent + stats.viewed + stats.in_progress + stats.accepted + stats.rejected
            stats.conversionRate = sentOrViewed > 0
                ? Math.round((stats.accepted / sentOrViewed) * 100)
                : 0

            return stats
        },
    })
}
