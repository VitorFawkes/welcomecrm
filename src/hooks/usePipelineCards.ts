import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { type ViewMode, type SubView, type FilterState, type GroupFilters } from './usePipelineFilters'
import type { Database } from '../database.types'
import { prepareSearchTerms } from '../lib/utils'

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

    // Aguardar auth antes de disparar query para evitar busca sem filtro de dono (timeout)
    const needsAuth = (viewMode === 'AGENT' && subView === 'MY_QUEUE') ||
        (viewMode === 'MANAGER' && subView === 'TEAM_VIEW')
    const isAuthReady = !!session?.user?.id
    const isTeamReady = subView !== 'TEAM_VIEW' || (myTeamMembers && myTeamMembers.length > 0)

    const query = useQuery({
        queryKey: ['cards', productFilter, viewMode, subView, filters, groupFilters, myTeamMembers],
        placeholderData: keepPreviousData,
        enabled: !needsAuth || (isAuthReady && isTeamReady),
        queryFn: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder perde tipo com encadeamento dinâmico
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

            // Apply Advanced Filters (from Drawer) - SMART SEARCH
            if (filters.search) {
                const { original, normalized, digitsOnly } = prepareSearchTerms(filters.search)

                if (original) {
                    // Campos de texto padrão
                    const textFields = [
                        `titulo.ilike.%${original}%`,
                        `pessoa_nome.ilike.%${original}%`,
                        `origem.ilike.%${original}%`,
                        `dono_atual_nome.ilike.%${original}%`,
                        `sdr_owner_nome.ilike.%${original}%`,
                        `vendas_nome.ilike.%${original}%`,
                        `pessoa_email.ilike.%${original}%`,
                        `external_id.ilike.%${original}%`
                    ]

                    // Busca de telefone — usa coluna normalizada (digits-only) para match cross-formato
                    if (normalized) {
                        textFields.push(`pessoa_telefone_normalizado.ilike.%${normalized}%`)
                        textFields.push(`pessoa_telefone.ilike.%${original}%`)
                    } else if (digitsOnly) {
                        textFields.push(`pessoa_telefone_normalizado.ilike.%${digitsOnly}%`)
                        textFields.push(`pessoa_telefone.ilike.%${original}%`)
                    } else {
                        textFields.push(`pessoa_telefone.ilike.%${original}%`)
                    }

                    query = query.or(textFields.join(','))
                }
            }

            if ((filters.ownerIds?.length ?? 0) > 0) {
                query = query.in('dono_atual_id', filters.ownerIds)
            }

            // NEW: SDR Filter
            if ((filters.sdrIds?.length ?? 0) > 0) {
                query = query.in('sdr_owner_id', filters.sdrIds)
            }

            // NEW: Planner Filter (vendas_owner_id)
            if ((filters.plannerIds?.length ?? 0) > 0) {
                query = query.in('vendas_owner_id', filters.plannerIds)
            }

            // NEW: Pós-Venda Filter (pos_owner_id)
            if ((filters.posIds?.length ?? 0) > 0) {
                query = query.in('pos_owner_id', filters.posIds)
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

            // Status Comercial Filter
            if ((filters.statusComercial?.length ?? 0) > 0) {
                query = query.in('status_comercial', filters.statusComercial)
            }

            // Origem Filter
            if ((filters.origem?.length ?? 0) > 0) {
                query = query.in('origem', filters.origem)
            }

            // Archived Filter — esconder cards arquivados do pipeline
            query = query.is('archived_at', null)

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
