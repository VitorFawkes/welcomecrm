import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

export function useStageRequirements(card: Card) {
    const { data: requirements, isLoading } = useQuery({
        queryKey: ['stage-requirements', card.pipeline_stage_id],
        queryFn: async () => {
            if (!card.pipeline_stage_id) return []

            // Fetch ALL required fields for this pipeline
            const { data, error } = await supabase
                .from('stage_fields_settings')
                .select('*, pipeline_stages!inner(ordem, fase)')
                .eq('required', true)
                .order('pipeline_stages(ordem)', { ascending: true })

            if (error) throw error

            // Fetch current stage order
            const { data: currentStage } = await supabase
                .from('pipeline_stages')
                .select('ordem')
                .eq('id', card.pipeline_stage_id)
                .single()

            const currentOrder = currentStage?.ordem || 0

            return (data || []).map((req: any) => ({
                ...req,
                isBlocking: req.pipeline_stages.ordem === currentOrder,
                isFuture: req.pipeline_stages.ordem > currentOrder
            })).filter((req: any) => req.isBlocking || req.isFuture)
        },
        enabled: !!card.pipeline_stage_id,
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    const checkRequirement = (fieldKey: string): boolean => {
        // Check in top level card fields
        if (fieldKey in card && (card as any)[fieldKey]) return true

        // Check in produto_data
        if (card.produto_data && typeof card.produto_data === 'object') {
            const produtoData = card.produto_data as any
            const value = produtoData[fieldKey]

            if (value === null || value === undefined || value === '') return false
            if (Array.isArray(value) && value.length === 0) return false
            if (typeof value === 'object' && Object.keys(value).length === 0) return false

            return true
        }

        return false
    }

    const blockingRequirements = requirements?.filter((r: any) => r.isBlocking) || []
    const futureRequirements = requirements?.filter((r: any) => r.isFuture) || []

    const missingBlocking = blockingRequirements.filter(req => !checkRequirement(req.field_key))
    const missingFuture = futureRequirements.filter(req => !checkRequirement(req.field_key))

    return {
        requirements,
        isLoading,
        blockingRequirements,
        futureRequirements,
        missingBlocking,
        missingFuture,
        checkRequirement
    }
}
