import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { type ViewMode, type SubView, type FilterState, type GroupFilters } from './usePipelineFilters'
import type { Database } from '../database.types'
import { prepareSearchTerms } from '../lib/utils'

type Product = Database['public']['Enums']['app_product'] | 'ALL'
export type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface UsePipelineListCardsProps {
    productFilter: Product
    viewMode: ViewMode
    subView: SubView
    filters: FilterState
    groupFilters: GroupFilters
    includeTerminalStages?: boolean
    terminalStageIds?: string[]
    page?: number
    pageSize?: number
}

interface PipelineListResult {
    data: Card[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export function usePipelineListCards({
    productFilter,
    viewMode,
    subView,
    filters,
    groupFilters,
    includeTerminalStages = false,
    terminalStageIds,
    page = 1,
    pageSize = 50
}: UsePipelineListCardsProps) {
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

    const needsAuth = (viewMode === 'AGENT' && subView === 'MY_QUEUE') ||
        (viewMode === 'MANAGER' && subView === 'TEAM_VIEW')
    const isAuthReady = !!session?.user?.id
    const isTeamReady = subView !== 'TEAM_VIEW' || (myTeamMembers && myTeamMembers.length > 0)

    return useQuery({
        queryKey: ['pipeline-list', productFilter, viewMode, subView, filters, groupFilters, myTeamMembers, includeTerminalStages, terminalStageIds, page, pageSize],
        placeholderData: keepPreviousData,
        enabled: !needsAuth || (isAuthReady && isTeamReady),
        queryFn: async (): Promise<PipelineListResult> => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- query builder perde tipo com encadeamento dinâmico
            let query = (supabase.from('view_cards_acoes') as any)
                .select('*', { count: 'exact' })

            if (productFilter !== 'ALL') {
                query = query.eq('produto', productFilter)
            }

            // Smart View Filters
            if (viewMode === 'AGENT') {
                if (subView === 'MY_QUEUE' && session?.user?.id) {
                    query = query.eq('dono_atual_id', session.user.id)
                }
            } else if (viewMode === 'MANAGER') {
                if (subView === 'TEAM_VIEW' && myTeamMembers && myTeamMembers.length > 0) {
                    query = query.in('dono_atual_id', myTeamMembers)
                }
                if (subView === 'FORECAST') {
                    const startOfMonth = new Date(); startOfMonth.setDate(1)
                    const endOfMonth = new Date(startOfMonth); endOfMonth.setMonth(endOfMonth.getMonth() + 1)
                    query = query.gte('data_fechamento', startOfMonth.toISOString()).lt('data_fechamento', endOfMonth.toISOString())
                }
            }

            // Search
            if (filters.search) {
                const { original, normalized, digitsOnly } = prepareSearchTerms(filters.search)

                if (original) {
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

            if ((filters.sdrIds?.length ?? 0) > 0) {
                query = query.in('sdr_owner_id', filters.sdrIds)
            }

            if ((filters.plannerIds?.length ?? 0) > 0) {
                query = query.in('vendas_owner_id', filters.plannerIds)
            }

            if ((filters.posIds?.length ?? 0) > 0) {
                query = query.in('pos_owner_id', filters.posIds)
            }

            if (filters.startDate) {
                query = query.gte('data_viagem_inicio', filters.startDate)
            }

            if (filters.endDate) {
                query = query.lte('data_viagem_inicio', filters.endDate)
            }

            if (filters.creationStartDate) {
                query = query.gte('created_at', `${filters.creationStartDate}T00:00:00`)
            }

            if (filters.creationEndDate) {
                query = query.lte('created_at', `${filters.creationEndDate}T23:59:59`)
            }

            if ((filters.statusComercial?.length ?? 0) > 0) {
                query = query.in('status_comercial', filters.statusComercial)
            }

            if ((filters.origem?.length ?? 0) > 0) {
                query = query.in('origem', filters.origem)
            }

            // Archived Filter
            query = query.is('archived_at', null)

            // Terminal Stages Filter — default: excluir concluídos/perdidos
            if (!includeTerminalStages && terminalStageIds && terminalStageIds.length > 0) {
                query = query.not('pipeline_stage_id', 'in', `(${terminalStageIds.join(',')})`)
            }

            // Exclude group parents
            query = query.eq('is_group_parent', false)

            // Group Filters (server-side para paginação correta)
            const { showLinked, showSolo } = groupFilters
            if (showLinked && !showSolo) {
                query = query.not('parent_card_id', 'is', null)
            } else if (showSolo && !showLinked) {
                query = query.is('parent_card_id', null)
            }

            // Sorting
            if (filters.sortBy && filters.sortBy !== 'data_proxima_tarefa') {
                query = query.order(filters.sortBy, { ascending: filters.sortDirection === 'asc', nullsFirst: false })
            } else {
                query = query.order('created_at', { ascending: false })
            }

            // Pagination
            const from = (page - 1) * pageSize
            const to = from + pageSize - 1
            query = query.range(from, to)

            const { data, error, count } = await query
            if (error) throw error

            const total = count || 0
            const totalPages = Math.ceil(total / pageSize)

            return {
                data: data as Card[],
                total,
                page,
                pageSize,
                totalPages
            }
        }
    })
}
