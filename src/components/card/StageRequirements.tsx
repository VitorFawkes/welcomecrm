import { useState, useEffect } from 'react'
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']
type StageObligation = Database['public']['Tables']['stage_obligations']['Row']
type CardObligation = Database['public']['Tables']['card_obligations']['Row']

interface StageRequirementsProps {
    card: Card
}

export default function StageRequirements({ card }: StageRequirementsProps) {
    const [obligations, setObligations] = useState<StageObligation[]>([])
    const [cardObligations, setCardObligations] = useState<CardObligation[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchObligations()
    }, [card.pipeline_stage_id])

    async function fetchObligations() {
        if (!card.pipeline_stage_id) return

        setLoading(true)
        try {
            // 1. Get definitions for this stage
            const { data: obs, error: obsError } = await (supabase.from('stage_obligations') as any)
                .select('*')
                .eq('stage_id', card.pipeline_stage_id)
                .eq('active', true)

            if (obsError) throw obsError
            setObligations(obs || [])

            // 2. Get status for this card
            const { data: status, error: statusError } = await (supabase.from('card_obligations') as any)
                .select('*')
                .eq('card_id', card.id)

            if (statusError) throw statusError
            setCardObligations(status || [])

        } catch (error) {
            console.error('Error fetching obligations:', error)
        } finally {
            setLoading(false)
        }
    }

    async function toggleObligation(obligationId: string, currentStatus: boolean) {
        try {
            if (currentStatus) {
                // Uncheck
                await (supabase.from('card_obligations') as any)
                    .delete()
                    .eq('card_id', card.id)
                    .eq('obligation_id', obligationId)
            } else {
                // Check
                const { data: { user } } = await supabase.auth.getUser()
                await (supabase.from('card_obligations') as any)
                    .insert({
                        card_id: card.id,
                        obligation_id: obligationId,
                        completed: true,
                        completed_by: user?.id,
                        completed_at: new Date().toISOString()
                    })
            }
            // Refresh
            fetchObligations()
        } catch (error) {
            console.error('Error toggling obligation:', error)
        }
    }

    function checkFieldRequirement(config: any): boolean {
        if (!config || !config.field) return false

        const field = config.field
        // Check in top level card fields
        if (field in card && (card as any)[field]) return true

        // Check in produto_data
        if (card.produto_data && typeof card.produto_data === 'object') {
            // Simple check for now, can be improved for nested paths
            if (field in card.produto_data && (card.produto_data as any)[field]) return true
        }

        return false
    }

    if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>
    if (obligations.length === 0) return null

    const completedCount = obligations.filter(o => {
        if (o.type === 'manual_check') {
            return cardObligations.some(co => co.obligation_id === o.id && co.completed)
        } else {
            return checkFieldRequirement(o.config)
        }
    }).length

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Obrigações da Etapa
                </h3>
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
                    {completedCount}/{obligations.length}
                </span>
            </div>

            <div className="divide-y divide-gray-50">
                {obligations.map(ob => {
                    const isManual = ob.type === 'manual_check'
                    let isCompleted = false

                    if (isManual) {
                        isCompleted = cardObligations.some(co => co.obligation_id === ob.id && co.completed)
                    } else {
                        isCompleted = checkFieldRequirement(ob.config)
                    }

                    return (
                        <div key={ob.id} className={`p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${isCompleted ? 'opacity-75' : ''}`}>
                            <button
                                onClick={() => isManual && toggleObligation(ob.id, isCompleted)}
                                disabled={!isManual}
                                className={`mt-0.5 flex-shrink-0 transition-colors ${!isManual ? 'cursor-default' : 'cursor-pointer'}`}
                            >
                                {isCompleted ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                ) : (
                                    <Circle className={`w-5 h-5 ${isManual ? 'text-gray-300 hover:text-indigo-500' : 'text-gray-200'}`} />
                                )}
                            </button>

                            <div className="flex-1">
                                <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                    {ob.title}
                                </p>
                                {!isManual && !isCompleted && (
                                    <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Preenchimento automático via campo
                                    </p>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
