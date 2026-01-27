import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { type ViewMode, type SubView, type FilterState, type GroupFilters } from './usePipelineFilters'
import type { Database } from '../database.types'

type Product = Database['public']['Enums']['app_product'] | 'ALL'
export type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface UsePipelineCardsProps {
    productFilter: Product
    viewMode: ViewMode
    subView: SubView
    filters: FilterState
    groupFilters: GroupFilters
}

export function usePipelineCards({ productFilter, viewMode, subView, filters, groupFilters }: UsePipelineCardsProps) {
    const { session, profile } = useAuth()

    // Fetch Team Members for Team View
    const { data: myTeamMembers } = useQuery({
        queryKey: ['my-team-members', profile?.team_id],
        enabled: !!profile?.team_id && viewMode === 'MANAGER' && subView === 'TEAM_VIEW',
        queryFn: async () => {
            if (!profile?.team_id) return []
            const { data, error } = await supabase
                .from('profiles')
                .select('id')
                .eq('team_id', profile.team_id)

            if (error) throw error
            return data.map(p => p.id)
        }
    })

    const query = useQuery({
        queryKey: ['cards', productFilter, viewMode, subView, filters, groupFilters, myTeamMembers],
        placeholderData: keepPreviousData,
        queryFn: async () => {
            let query = (supabase.from('view_cards_acoes') as any)
                .select('*')

            if (productFilter !== 'ALL') {
                query = query.eq('produto', productFilter)
            }

            // Apply Smart View Filters
            if (viewMode === 'AGENT') {
                if (subView === 'MY_QUEUE') {
                    // Filter by current user
                    if (session?.user?.id) {
                        query = query.eq('dono_atual_id', session.user.id)
                    }
                }
                // 'ATTENTION' logic would go here (e.g. overdue)
            } else if (viewMode === 'MANAGER') {
                if (subView === 'TEAM_VIEW') {
                    // Filter by team members if available
                    if (myTeamMembers && myTeamMembers.length > 0) {
                        query = query.in('dono_atual_id', myTeamMembers)
                    }
                }
                if (subView === 'FORECAST') {
                    // Filter by closing_date this month
                    const startOfMonth = new Date(); startOfMonth.setDate(1);
                    const endOfMonth = new Date(startOfMonth); endOfMonth.setMonth(endOfMonth.getMonth() + 1);
                    query = query.gte('data_fechamento', startOfMonth.toISOString()).lt('data_fechamento', endOfMonth.toISOString())
                }
            }

            // Apply Advanced Filters (from Drawer)
            if (filters.search) {
                const searchTerm = filters.search.trim();
                if (searchTerm) {
                    query = query.or(`titulo.ilike.%${searchTerm}%,pessoa_nome.ilike.%${searchTerm}%,origem.ilike.%${searchTerm}%,dono_atual_nome.ilike.%${searchTerm}%`)
                }
            }

            if ((filters.ownerIds?.length ?? 0) > 0) {
                query = query.in('dono_atual_id', filters.ownerIds)
            }

            // NEW: SDR Filter
            if ((filters.sdrIds?.length ?? 0) > 0) {
                query = query.in('sdr_owner_id', filters.sdrIds)
            }

            if (filters.startDate) {
                query = query.gte('data_viagem_inicio', filters.startDate)
            }

            if (filters.endDate) {
                query = query.lte('data_viagem_inicio', filters.endDate)
            }

            // NEW: Creation Date Filter (TIMESTAMP)
            if (filters.creationStartDate) {
                query = query.gte('created_at', `${filters.creationStartDate}T00:00:00`)
            }

            if (filters.creationEndDate) {
                query = query.lte('created_at', `${filters.creationEndDate}T23:59:59`)
            }

            // Apply Sorting
            if (filters.sortBy && filters.sortBy !== 'data_proxima_tarefa') {
                query = query.order(filters.sortBy, { ascending: filters.sortDirection === 'asc', nullsFirst: false })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            const { data, error } = await query
            if (error) throw error

            let filteredData = data as Card[]

            // Apply Group Filters (Client-side for flexibility)
            const { showLinked, showSolo } = groupFilters

            filteredData = filteredData.filter(card => {
                // ALWAYS exclude Group Parents from Kanban/List
                if (card.is_group_parent) return false

                const isLinked = !!card.parent_card_id
                const isSolo = !isLinked

                if (isLinked && showLinked) return true
                if (isSolo && showSolo) return true

                return false
            })

            return filteredData
        }
    })

    return {
        ...query,
        myTeamMembers
    }
}
