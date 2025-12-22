import { useState } from 'react'
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    MouseSensor,
    TouchSensor,
    PointerSensor,
    type DragEndEvent,
    type DragStartEvent
} from '@dnd-kit/core'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import StageChangeModal from '../card/StageChangeModal'
import QualityGateModal from '../card/QualityGateModal'
import { useQualityGate } from '../../hooks/useQualityGate'
import type { Database } from '../../database.types'

type Product = Database['public']['Enums']['app_product'] | 'ALL'
type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface KanbanBoardProps {
    productFilter: Product
}

export default function KanbanBoard({ productFilter }: KanbanBoardProps) {
    const queryClient = useQueryClient()
    const [activeCard, setActiveCard] = useState<Card | null>(null)
    const { validateMove } = useQualityGate()

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 6,
            },
        })
    )

    const { data: stages } = useQuery({
        queryKey: ['stages', productFilter],
        queryFn: async () => {
            let query = (supabase.from('pipeline_stages') as any)
                .select('*')
                .order('ordem')

            // Filtrar stages pelo pipeline do produto
            if (productFilter !== 'ALL') {
                const { data: pipeline } = await (supabase.from('pipelines') as any)
                    .select('id')
                    .eq('produto', productFilter)
                    .single()

                if (pipeline) {
                    query = query.eq('pipeline_id', pipeline.id)
                }
            }

            const { data, error } = await query
            if (error) throw error
            return data as any[]
        }
    })

    const { data: cards } = useQuery({
        queryKey: ['cards', productFilter],
        queryFn: async () => {
            let query = (supabase.from('view_cards_acoes') as any)
                .select('*')

            if (productFilter !== 'ALL') {
                query = query.eq('produto', productFilter)
            }

            const { data, error } = await query
            if (error) throw error
            return data as Card[]
        }
    })

    const moveCardMutation = useMutation({
        mutationFn: async ({ cardId, stageId }: { cardId: string, stageId: string }) => {
            const { error } = await (supabase.rpc as any)('mover_card', {
                p_card_id: cardId,
                p_nova_etapa_id: stageId,
                p_motivo_perda_id: null
            })
            if (error) throw error
        },
        onMutate: ({ cardId, stageId }) => {
            // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
            queryClient.cancelQueries({ queryKey: ['cards', productFilter] })

            // Snapshot the previous value
            const previousCards = queryClient.getQueryData<Card[]>(['cards', productFilter])

            // Find new stage info for complete update
            const newStage = stages?.find(s => s.id === stageId)

            // Optimistically update to the new value
            if (previousCards) {
                queryClient.setQueryData<Card[]>(['cards', productFilter], (old) => {
                    if (!old) return []
                    return old.map((card) => {
                        if (card.id === cardId) {
                            return {
                                ...card,
                                pipeline_stage_id: stageId,
                                fase: newStage?.fase || card.fase,
                                etapa_nome: newStage?.nome || card.etapa_nome
                            }
                        }
                        return card
                    })
                })
            }

            // Return a context object with the snapshotted value
            return { previousCards }
        },
        onError: (_err, _variables, context) => {
            // If the mutation fails, use the context returned from onMutate to roll back
            if (context?.previousCards) {
                queryClient.setQueryData(['cards', productFilter], context.previousCards)
            }
        },
        onSuccess: () => {
            // Only refetch after successful mutation
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-funnel'] })
            queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
        }
    })

    const [stageChangeModalOpen, setStageChangeModalOpen] = useState(false)
    const [qualityGateModalOpen, setQualityGateModalOpen] = useState(false)

    const [pendingMove, setPendingMove] = useState<{
        cardId: string,
        stageId: string,
        currentOwnerId?: string,
        sdrName?: string,
        targetStageName: string,
        missingFields?: { key: string, label: string }[]
    } | null>(null)

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current) {
            setActiveCard(event.active.data.current as Card)
        }
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const cardId = active.id as string
            const stageId = over.id as string
            const currentStageId = active.data.current?.pipeline_stage_id
            const currentFase = active.data.current?.fase
            const targetStage = stages?.find(s => s.id === stageId)
            const targetFase = targetStage?.fase
            const card = active.data.current as Card

            if (stageId !== currentStageId) {
                // 1. Check Quality Gate (Mandatory Fields)
                const validation = validateMove(card, stageId)
                if (!validation.valid) {
                    setPendingMove({
                        cardId,
                        stageId,
                        targetStageName: targetStage?.nome || 'Nova Etapa',
                        missingFields: validation.missingFields
                    })
                    setQualityGateModalOpen(true)
                    setActiveCard(null) // Reset active card to remove drag overlay
                    return
                }

                // 2. Check Owner Change (SDR -> Planner)
                if (currentFase === 'SDR' && targetFase && targetFase !== 'SDR') {
                    setPendingMove({
                        cardId,
                        stageId,
                        currentOwnerId: active.data.current?.dono_atual_id,
                        sdrName: active.data.current?.sdr_owner_id ? 'SDR Atual' : undefined,
                        targetStageName: targetStage?.nome || 'Nova Etapa'
                    })
                    setStageChangeModalOpen(true)
                    setActiveCard(null)
                    return
                }

                // Validate UUIDs
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                if (!uuidRegex.test(cardId) || !uuidRegex.test(stageId)) {
                    console.error('Invalid UUIDs for move:', { cardId, stageId })
                    return
                }

                moveCardMutation.mutate({ cardId, stageId })
            }
        }

        setActiveCard(null)
    }

    const handleConfirmStageChange = (newOwnerId: string) => {
        if (pendingMove) {
            const updateOwner = async () => {
                const { error } = await (supabase.from('cards') as any)
                    .update({ dono_atual_id: newOwnerId })
                    .eq('id', pendingMove.cardId)

                if (error) {
                    console.error('Error updating owner:', error)
                    alert('Erro ao atualizar responsável.')
                    return
                }

                moveCardMutation.mutate({ cardId: pendingMove.cardId, stageId: pendingMove.stageId })
                setStageChangeModalOpen(false)
                setPendingMove(null)
                setActiveCard(null)
            }

            updateOwner()
        }
    }

    const handleConfirmQualityGate = () => {
        if (pendingMove) {
            // After filling fields, we still need to check if we need to change owner
            const card = cards?.find(c => c.id === pendingMove.cardId)
            const currentFase = card?.fase
            const targetStage = stages?.find(s => s.id === pendingMove.stageId)
            const targetFase = targetStage?.fase

            setQualityGateModalOpen(false)

            if (currentFase === 'SDR' && targetFase && targetFase !== 'SDR') {
                // Open Owner Change Modal
                setStageChangeModalOpen(true)
                // pendingMove is already set with correct IDs
            } else {
                // Just move
                moveCardMutation.mutate({ cardId: pendingMove.cardId, stageId: pendingMove.stageId })
                setPendingMove(null)
            }
        }
    }

    if (!stages || !cards) return <div className="h-full w-full animate-pulse bg-gray-100 rounded-lg"></div>

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {stages.map((stage) => (
                    <KanbanColumn
                        key={stage.id}
                        stage={stage}
                        cards={cards.filter(c => c.pipeline_stage_id === stage.id)}
                    />
                ))}
            </div>
            <DragOverlay
                dropAnimation={{
                    duration: 0,
                    easing: 'ease',
                }}
            >
                {activeCard ? (
                    <div className="rotate-3 scale-105 cursor-grabbing opacity-80">
                        <KanbanCard card={activeCard} />
                    </div>
                ) : null}
            </DragOverlay>

            {pendingMove && (
                <>
                    <StageChangeModal
                        isOpen={stageChangeModalOpen}
                        onClose={() => {
                            setStageChangeModalOpen(false)
                            setPendingMove(null)
                            setActiveCard(null)
                        }}
                        onConfirm={handleConfirmStageChange}
                        currentOwnerId={pendingMove.currentOwnerId || ''}
                        sdrName={pendingMove.sdrName}
                        targetStageName={pendingMove.targetStageName}
                    />

                    <QualityGateModal
                        isOpen={qualityGateModalOpen}
                        onClose={() => {
                            setQualityGateModalOpen(false)
                            setPendingMove(null)
                            setActiveCard(null)
                        }}
                        onConfirm={handleConfirmQualityGate}
                        cardId={pendingMove.cardId}
                        targetStageName={pendingMove.targetStageName}
                        missingFields={pendingMove.missingFields || []}
                    />
                </>
            )}
        </DndContext>
    )
}
