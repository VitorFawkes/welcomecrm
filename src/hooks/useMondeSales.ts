import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

// ============================================
// Types
// ============================================
export type MondeSaleStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'

export interface MondeSale {
    id: string
    card_id: string
    proposal_id: string | null
    monde_sale_id: string | null
    monde_sale_number: string | null
    idempotency_key: string
    sale_date: string
    travel_start_date: string | null
    travel_end_date: string | null
    total_value: number
    currency: string
    status: MondeSaleStatus
    attempts: number
    max_attempts: number
    next_retry_at: string | null
    error_message: string | null
    created_by: string
    sent_at: string | null
    created_at: string
    updated_at: string
}

export interface MondeSaleItem {
    id: string
    sale_id: string
    proposal_item_id: string | null
    proposal_flight_id: string | null
    item_type: string
    title: string
    description: string | null
    supplier: string | null
    unit_price: number
    quantity: number
    total_price: number
    service_date_start: string | null
    service_date_end: string | null
    item_metadata: Record<string, unknown>
    created_at: string
}

export interface MondeSaleWithItems extends MondeSale {
    items: MondeSaleItem[]
    creator?: {
        id: string
        nome: string | null
        email: string | null
    }
}

export interface CreateSaleInput {
    card_id: string
    proposal_id?: string | null
    sale_date: string
    items: Array<{
        proposal_item_id?: string
        proposal_flight_id?: string
        card_financial_item_id?: string
        supplier?: string
    }>
}

// ============================================
// Query Keys
// ============================================
export const mondeSalesKeys = {
    all: ['monde-sales'] as const,
    byCard: (cardId: string) => [...mondeSalesKeys.all, 'card', cardId] as const,
    detail: (saleId: string) => [...mondeSalesKeys.all, 'detail', saleId] as const,
    sentItems: (cardId: string) => [...mondeSalesKeys.all, 'sent-items', cardId] as const,
}

// ============================================
// useMondeSalesByCard - List sales for a card
// ============================================
export function useMondeSalesByCard(cardId: string | undefined) {
    return useQuery({
        queryKey: mondeSalesKeys.byCard(cardId || ''),
        enabled: !!cardId,
        queryFn: async () => {
            if (!cardId) return []

            const { data: sales, error } = await supabase
                .from('monde_sales')
                .select(`
                    *,
                    creator:profiles!monde_sales_created_by_fkey(id, nome, email)
                `)
                .eq('card_id', cardId)
                .order('created_at', { ascending: false })

            if (error) {
                console.error('[useMondeSalesByCard] Error:', error)
                throw error
            }

            if (!sales || sales.length === 0) return []

            // Fetch items for all sales
            const saleIds = sales.map(s => s.id)
            const { data: items } = await supabase
                .from('monde_sale_items')
                .select('*')
                .in('sale_id', saleIds)

            // Map items to sales
            return sales.map(sale => ({
                ...sale,
                items: (items || []).filter(item => item.sale_id === sale.id)
            })) as MondeSaleWithItems[]
        }
    })
}

// ============================================
// useMondeSaleDetail - Get single sale with items
// ============================================
export function useMondeSaleDetail(saleId: string | undefined) {
    return useQuery({
        queryKey: mondeSalesKeys.detail(saleId || ''),
        enabled: !!saleId,
        queryFn: async () => {
            if (!saleId) return null

            const { data: sale, error } = await supabase
                .from('monde_sales')
                .select(`
                    *,
                    creator:profiles!monde_sales_created_by_fkey(id, nome, email)
                `)
                .eq('id', saleId)
                .single()

            if (error) throw error

            const { data: items } = await supabase
                .from('monde_sale_items')
                .select('*')
                .eq('sale_id', saleId)

            return {
                ...sale,
                items: items || []
            } as MondeSaleWithItems
        }
    })
}

// ============================================
// useSentProposalItems - Check which items are already sold
// ============================================
export function useSentProposalItems(cardId: string | undefined) {
    return useQuery({
        queryKey: mondeSalesKeys.sentItems(cardId || ''),
        enabled: !!cardId,
        queryFn: async () => {
            if (!cardId) return { itemIds: [], flightIds: [] }

            // Use the view for efficiency
            const { data, error } = await supabase
                .from('v_monde_sent_items')
                .select('proposal_item_id, proposal_flight_id, sale_id, monde_sale_id, sale_date')
                .eq('card_id', cardId)

            if (error) {
                // View might not exist yet, fallback to manual query
                const { data: sales } = await supabase
                    .from('monde_sales')
                    .select('id')
                    .eq('card_id', cardId)
                    .eq('status', 'sent')

                if (!sales || sales.length === 0) {
                    return { itemIds: [], flightIds: [] }
                }

                const saleIds = sales.map(s => s.id)
                const { data: items } = await supabase
                    .from('monde_sale_items')
                    .select('proposal_item_id, proposal_flight_id')
                    .in('sale_id', saleIds)

                return {
                    itemIds: (items || []).map(i => i.proposal_item_id).filter(Boolean) as string[],
                    flightIds: (items || []).map(i => i.proposal_flight_id).filter(Boolean) as string[]
                }
            }

            return {
                itemIds: (data || []).map(i => i.proposal_item_id).filter(Boolean) as string[],
                flightIds: (data || []).map(i => i.proposal_flight_id).filter(Boolean) as string[],
                details: data || []
            }
        }
    })
}

// ============================================
// useCreateMondeSale - Create new sale
// ============================================
export function useCreateMondeSale() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (input: CreateSaleInput) => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.access_token) {
                throw new Error('Não autenticado')
            }

            const response = await supabase.functions.invoke('monde-sales-create', {
                body: input,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            })

            if (response.error) {
                throw new Error(response.error.message || 'Erro ao criar venda')
            }

            if (!response.data?.success) {
                throw new Error(response.data?.error || 'Erro ao criar venda')
            }

            return response.data
        },
        onSuccess: (data, variables) => {
            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: mondeSalesKeys.byCard(variables.card_id) })
            queryClient.invalidateQueries({ queryKey: mondeSalesKeys.sentItems(variables.card_id) })

            toast.success('Venda criada com sucesso', {
                description: `${data.items_count} items adicionados à fila de envio`
            })
        },
        onError: (error: Error) => {
            console.error('[useCreateMondeSale] Error:', error)
            toast.error('Erro ao criar venda', {
                description: error.message
            })
        }
    })
}

// ============================================
// useCancelMondeSale - Cancel a pending sale
// ============================================
export function useCancelMondeSale() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ saleId, cardId }: { saleId: string; cardId: string }) => {
            const { error } = await supabase
                .from('monde_sales')
                .update({ status: 'cancelled' as MondeSaleStatus })
                .eq('id', saleId)
                .in('status', ['pending', 'failed'])

            if (error) throw error

            return { saleId, cardId }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: mondeSalesKeys.byCard(data.cardId) })
            queryClient.invalidateQueries({ queryKey: mondeSalesKeys.sentItems(data.cardId) })

            toast.success('Venda cancelada')
        },
        onError: (error: Error) => {
            toast.error('Erro ao cancelar venda', {
                description: error.message
            })
        }
    })
}

// ============================================
// useRetryMondeSale - Retry a failed sale
// ============================================
export function useRetryMondeSale() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ saleId, cardId }: { saleId: string; cardId: string }) => {
            const { error } = await supabase
                .from('monde_sales')
                .update({
                    status: 'pending' as MondeSaleStatus,
                    next_retry_at: null,
                    error_message: null
                })
                .eq('id', saleId)
                .eq('status', 'failed')

            if (error) throw error

            return { saleId, cardId }
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: mondeSalesKeys.byCard(data.cardId) })

            toast.success('Venda reagendada para envio')
        },
        onError: (error: Error) => {
            toast.error('Erro ao reagendar venda', {
                description: error.message
            })
        }
    })
}

// ============================================
// Helper: Get status badge info
// ============================================
export function getMondeSaleStatusInfo(status: MondeSaleStatus) {
    const statusMap = {
        pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: 'clock' },
        processing: { label: 'Enviando', color: 'bg-blue-100 text-blue-800', icon: 'loader' },
        sent: { label: 'Enviado', color: 'bg-green-100 text-green-800', icon: 'check' },
        failed: { label: 'Falhou', color: 'bg-red-100 text-red-800', icon: 'x' },
        cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: 'ban' }
    }
    return statusMap[status] || statusMap.pending
}

// ============================================
// Preview Types
// ============================================
export interface MondeFieldMapping {
    crm_field: string
    crm_value: string | number | null
    monde_field: string
    monde_value: string | number | null
}

export interface MondePreviewItem {
    crm: {
        id: string
        type: 'proposal_item' | 'proposal_flight'
        item_type: string
        title: string
        description: string | null
        supplier: string | null
        price: number
        rich_content: Record<string, unknown>
    }
    monde_type: string
    monde_object: Record<string, unknown>
    field_mappings: MondeFieldMapping[]
}

export interface MondePreviewResponse {
    card: { id: string; titulo: string }
    proposal: { id: string; status: string; accepted_at: string | null; accepted_total: number | null }
    travel_agent: { name: string; email: string } | null
    shadow_mode: boolean
    cnpj_configured: boolean
    total_value: number
    items_count: number
    items_preview: MondePreviewItem[]
    full_payload: Record<string, unknown>
}

// ============================================
// useMondePreview - Get preview of Monde payload
// ============================================
export function useMondePreview(cardId: string | undefined, proposalId: string | undefined) {
    return useQuery({
        queryKey: [...mondeSalesKeys.all, 'preview', cardId, proposalId],
        enabled: !!cardId && !!proposalId,
        staleTime: 30_000,
        queryFn: async (): Promise<MondePreviewResponse> => {
            const { data: { session } } = await supabase.auth.getSession()

            const response = await supabase.functions.invoke('monde-sales-preview', {
                body: { cardId, proposalId },
                headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                },
            })

            if (response.error) {
                throw new Error(response.error.message || 'Erro ao gerar preview')
            }

            return response.data as MondePreviewResponse
        },
    })
}
