import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { type LeadsFilterState } from './useLeadsFilters'
import type { Database } from '../database.types'
import { prepareSearchTerms } from '../lib/utils'

export type LeadCard = Database['public']['Views']['view_cards_acoes']['Row']

interface UseLeadsQueryProps {
    filters: LeadsFilterState
    enabled?: boolean
}

export function useLeadsQuery({ filters, enabled = true }: UseLeadsQueryProps) {
    return useQuery({
        queryKey: ['leads', filters],
        enabled,
        placeholderData: keepPreviousData,
        queryFn: async () => {
            let query = (supabase.from('view_cards_acoes') as any)
                .select('*')

            // Search filter
            if (filters.search) {
                const { original, normalized } = prepareSearchTerms(filters.search)

                if (original) {
                    const textFields = [
                        `titulo.ilike.%${original}%`,
                        `pessoa_nome.ilike.%${original}%`,
                        `origem.ilike.%${original}%`,
                        `dono_atual_nome.ilike.%${original}%`,
                        `pessoa_email.ilike.%${original}%`,
                        `external_id.ilike.%${original}%`
                    ]

                    if (normalized) {
                        textFields.push(`pessoa_telefone.ilike.%${normalized}%`)
                        textFields.push(`pessoa_telefone.ilike.%${original}%`)
                    } else {
                        textFields.push(`pessoa_telefone.ilike.%${original}%`)
                    }

                    query = query.or(textFields.join(','))
                }
            }

            // Owner filter
            if ((filters.ownerIds?.length ?? 0) > 0) {
                query = query.in('dono_atual_id', filters.ownerIds)
            }

            // Stage filter
            if ((filters.stageIds?.length ?? 0) > 0) {
                query = query.in('pipeline_stage_id', filters.stageIds)
            }

            // Status comercial filter
            if ((filters.statusComercial?.length ?? 0) > 0) {
                query = query.in('status_comercial', filters.statusComercial)
            }

            // Prioridade filter
            if ((filters.prioridade?.length ?? 0) > 0) {
                query = query.in('prioridade', filters.prioridade)
            }

            // Creation date filter
            if (filters.creationStartDate) {
                query = query.gte('created_at', `${filters.creationStartDate}T00:00:00`)
            }

            if (filters.creationEndDate) {
                query = query.lte('created_at', `${filters.creationEndDate}T23:59:59`)
            }

            // Sorting
            if (filters.sortBy) {
                query = query.order(filters.sortBy, {
                    ascending: filters.sortDirection === 'asc',
                    nullsFirst: false
                })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            const { data, error } = await query
            if (error) throw error

            // Filter out group parents (view already excludes deleted cards)
            return (data as LeadCard[]).filter(card => !card.is_group_parent)
        }
    })
}
