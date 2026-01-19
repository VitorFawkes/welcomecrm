
import { useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'
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
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import KanbanColumn from './KanbanColumn'
import KanbanCard from './KanbanCard'
import KanbanPhaseGroup from './KanbanPhaseGroup'
import { Users } from 'lucide-react'
import StageChangeModal from '../card/StageChangeModal'
import QualityGateModal from '../card/QualityGateModal'
import { useQualityGate } from '../../hooks/useQualityGate'
import { useAuth } from '../../contexts/AuthContext'
import type { Database } from '../../database.types'
import { usePipelineFilters, type ViewMode, type SubView, type FilterState } from '../../hooks/usePipelineFilters'
import { AlertTriangle } from 'lucide-react'
import { Button } from '../ui/Button'
import { usePipelinePhases } from '../../hooks/usePipelinePhases'
import { useHorizontalScroll } from '../../hooks/useHorizontalScroll'
import { ScrollArrows } from '../ui/ScrollArrows'

type Product = Database['public']['Enums']['app_product'] | 'ALL'
type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface KanbanBoardProps {
    productFilter: Product
    viewMode: ViewMode
    subView: SubView
    filters: FilterState
    className?: string // Allow parent to control layout/padding
}

export default function KanbanBoard({ productFilter, viewMode, subView, filters: propFilters, className }: KanbanBoardProps) {
    const filters = propFilters || {}
    const queryClient = useQueryClient()
    const [activeCard, setActiveCard] = useState<Card | null>(null)
    const { collapsedPhases, setCollapsedPhases, groupFilters } = usePipelineFilters()
    const { validateMove } = useQualityGate()
    const { session } = useAuth() // Need auth to know who "ME" is
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const { data: phasesData } = usePipelinePhases()

    // Elite horizontal scroll with Shift+Wheel, Drag-to-Pan, and arrow indicators
    // Must be called before any conditional returns to respect React hooks rules
    const {
        isDragging,
        showLeftArrow,
        showRightArrow,
        scrollLeft: scrollLeftFn,
        scrollRight: scrollRightFn,
    } = useHorizontalScroll(scrollContainerRef)

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



    // Actually, just [] is fine as ref persists, but we need to make sure container exists.
    // The previous logic had a check `if (!container) return`. If container mounts LATER (after loading), this effect won't run again with [].
    // We should probably rely on a callback ref or just ensure it runs when loading finishes.
    // However, for now, let's just move it up. The early return `if (!stages)` prevents the component from rendering the DIV with the ref. 
    // Wait. If we return early, the DIV with `ref={scrollContainerRef}` is NOT rendered.
    // So `scrollContainerRef.current` will be null.
    // If we run this effect at the top, `scrollContainerRef.current` will be null on first run if loading.
    // And since it has [] deps, it WON'T run again when loading finishes and the div renders.
    // This is TRICKY. 
    // We need to trigger this effect when the ref becomes available OR when loading finishes.
    // Let's add `cards` or `stages` to dependency array so it retries attaching listeners when data loads.

    // Revised replacement content with dependencies:

    const { data: stages } = useQuery({
        queryKey: ['stages', productFilter],
        queryFn: async () => {
            let query = (supabase.from('pipeline_stages') as any)
                .select('*')
                .eq('ativo', true)
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

    const { data: cards, isError, refetch } = useQuery({
        queryKey: ['cards', productFilter, viewMode, subView, filters, groupFilters], // Re-fetch when view changes
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
                    // Ideally filter by team, for now show all (Macro)
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
                query = query.ilike('titulo', `% ${filters.search}% `)
            }

            if ((filters.ownerIds?.length ?? 0) > 0) {
                query = query.in('dono_atual_id', filters.ownerIds)
            }

            // NEW: SDR Filter
            if ((filters.sdrIds?.length ?? 0) > 0) {
                query = query.in('sdr_owner_id', filters.sdrIds)
            }

            // NEW: Team Filter (using new view column)
            // if (filters.teamIds?.length > 0) {
            //     query = query.in('owner_team_id', filters.teamIds)
            // }

            // NEW: Department Filter (using new view column)
            // if (filters.departmentIds?.length > 0) {
            //     query = query.in('owner_department_id', filters.departmentIds)
            // }


            if (filters.startDate) {
                query = query.gte('data_viagem_inicio', filters.startDate)
            }

            if (filters.endDate) {
                query = query.lte('data_viagem_inicio', filters.endDate)
            }

            // NEW: Creation Date Filter
            if (filters.creationStartDate) {
                query = query.gte('created_at', filters.creationStartDate)
            }

            if (filters.creationEndDate) {
                query = query.lte('created_at', filters.creationEndDate)
            }

            // Apply Sorting
            if (filters.sortBy) {
                // Handle special case for 'data_proxima_tarefa' which might be null
                // We want nulls last usually, but Supabase/Postgres handles this.
                // For 'data_proxima_tarefa' asc, we want earliest dates first. Nulls (no task) should be last.
                // Postgres default for ASC is NULLS LAST, for DESC is NULLS FIRST.
                // We might need to adjust if we want strict behavior, but standard order is fine for now.
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
                // ALWAYS exclude Group Parents from Kanban
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
            queryClient.cancelQueries({ queryKey: ['cards', productFilter, viewMode, subView, filters, groupFilters] })

            // Snapshot the previous value
            const previousCards = queryClient.getQueryData<Card[]>(['cards', productFilter, viewMode, subView, filters, groupFilters])

            // Find new stage info for complete update
            const newStage = stages?.find(s => s.id === stageId)

            // Optimistically update to the new value
            if (previousCards) {
                queryClient.setQueryData<Card[]>(['cards', productFilter, viewMode, subView, filters, groupFilters], (old) => {
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
                queryClient.setQueryData(['cards', productFilter, viewMode, subView, filters, groupFilters], context.previousCards)
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
        missingFields?: { key: string, label: string }[],
        requiredRole?: string
    } | null>(null)

    // Edge Scrolling Logic
    useEffect(() => {
        const container = scrollContainerRef.current
        if (!container) return

        let animationFrameId: number
        let scrollSpeed = 0

        const handleMouseMove = (e: MouseEvent) => {
            const { left, right } = container.getBoundingClientRect()
            const x = e.clientX

            const threshold = 150
            const maxSpeed = 20

            if (x < left + threshold) {
                const intensity = Math.max(0, 1 - (x - left) / threshold)
                scrollSpeed = -maxSpeed * intensity
            } else if (x > right - threshold) {
                const intensity = Math.max(0, 1 - (right - x) / threshold)
                scrollSpeed = maxSpeed * intensity
            } else {
                scrollSpeed = 0
            }
        }

        const scroll = () => {
            if (scrollSpeed !== 0 && container) {
                container.scrollLeft += scrollSpeed
            }
            animationFrameId = requestAnimationFrame(scroll)
        }

        const handleMouseLeave = () => {
            scrollSpeed = 0
        }

        container.addEventListener('mousemove', handleMouseMove)
        container.addEventListener('mouseleave', handleMouseLeave)

        scroll()

        return () => {
            container.removeEventListener('mousemove', handleMouseMove)
            container.removeEventListener('mouseleave', handleMouseLeave)
            cancelAnimationFrame(animationFrameId)
        }
    }, [cards, stages]) // Added deps so it runs after loading finishes and valid ref exists

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
            const targetStage = stages?.find(s => s.id === stageId)
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

                // 2. Check Governance Rules (Target Role)
                if (targetStage?.target_role) {
                    setPendingMove({
                        cardId,
                        stageId,
                        currentOwnerId: active.data.current?.dono_atual_id,
                        sdrName: active.data.current?.sdr_owner_id ? 'SDR Atual' : undefined,
                        targetStageName: targetStage?.nome || 'Nova Etapa',
                        requiredRole: targetStage.target_role
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
            const targetStage = stages?.find(s => s.id === pendingMove.stageId)

            setQualityGateModalOpen(false)

            if (targetStage?.target_role) {
                // Open Owner Change Modal
                setPendingMove(prev => prev ? { ...prev, requiredRole: targetStage.target_role } : null)
                setStageChangeModalOpen(true)
            } else {
                // Just move
                moveCardMutation.mutate({ cardId: pendingMove.cardId, stageId: pendingMove.stageId })
                setPendingMove(null)
            }
        }
    }

    if (isError) {
        return (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
                <div className="rounded-full bg-red-100 p-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Erro ao carregar o pipeline</h3>
                    <p className="text-sm text-gray-500">Não foi possível buscar os cards. Tente novamente.</p>
                </div>
                <Button onClick={() => refetch()} variant="outline">
                    Tentar Novamente
                </Button>
            </div>
        )
    }

    if (!stages || !cards) return <div className="h-full w-full animate-pulse bg-gray-100 rounded-lg"></div>

    const togglePhase = (phaseName: string) => {
        const isCollapsing = !collapsedPhases.includes(phaseName)
        const newPhases = isCollapsing
            ? [...collapsedPhases, phaseName]
            : collapsedPhases.filter(p => p !== phaseName)

        setCollapsedPhases(newPhases)

        if (isCollapsing && scrollContainerRef.current) {
            // Wait for state update and layout shift
            setTimeout(() => {
                scrollContainerRef.current?.scrollTo({ left: 0, behavior: 'smooth' })
            }, 100)
        }
    }

    // Group stages by phase using dynamic phases
    // If phasesData is not loaded yet, we might want to show a loader or fallback
    // We map over the phasesData to ensure order and color
    const phases = phasesData || []
    const displayPhases = [...phases]

    // Calculate Totals for Sticky Footer
    const totalPipelineValue = cards.reduce((acc, c) => acc + (c.valor_estimado || 0), 0)
    const totalCards = cards.length





    return (
        <div className={cn("flex flex-col h-full relative", className)}>
            {/* Scroll Arrows - Elite UX */}
            <ScrollArrows
                showLeft={showLeftArrow}
                showRight={showRightArrow}
                onScrollLeft={scrollLeftFn}
                onScrollRight={scrollRightFn}
            />

            {/* Kanban Columns */}
            <div
                ref={scrollContainerRef}
                className={cn(
                    "flex-1 overflow-x-auto overflow-y-hidden min-h-0",
                    "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']",
                    isDragging && "cursor-grabbing"
                )}
            >
                <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 w-max min-w-full px-4 items-stretch pt-2 h-full">
                        <div className="flex gap-6 items-stretch h-full">
                            {cards.length === 0 ? (
                                <div className="flex flex-col items-center justify-center w-[calc(100vw-20rem)] py-20 bg-white/5 rounded-xl border border-dashed border-gray-300">
                                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                                        <Users className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-gray-900">Nenhum card encontrado</h3>
                                    <p className="text-gray-500 max-w-xs text-center mt-2">
                                        Tente ajustar os filtros de Grupos, Vinculadas ou Avulsas para ver mais resultados.
                                    </p>
                                </div>
                            ) : displayPhases.map((phase) => {
                                // Filter stages that belong to this phase
                                // We support both phase_id (new) and fase name match (legacy migration)
                                const phaseStages = stages.filter(s =>
                                    s.phase_id === phase.id ||
                                    (!s.phase_id && s.fase === phase.name)
                                )

                                // If no stages for this phase, skip rendering it (optional, but cleaner)
                                if (phaseStages.length === 0) return null

                                const phaseCards = cards.filter(c => phaseStages.some(s => s.id === c.pipeline_stage_id))
                                const totalCount = phaseCards.length
                                const totalValue = phaseCards.reduce((acc, c) => acc + (c.valor_estimado || 0), 0)

                                return (
                                    <KanbanPhaseGroup
                                        key={phase.id}
                                        phaseName={phase.name}
                                        isCollapsed={collapsedPhases.includes(phase.name)}
                                        onToggle={() => togglePhase(phase.name)}
                                        totalCount={totalCount}
                                        totalValue={totalValue}
                                        phaseColor={phase.color}
                                        stages={phaseStages}
                                        cards={phaseCards}
                                    >
                                        {phaseStages.map((stage) => (
                                            <KanbanColumn
                                                key={stage.id}
                                                stage={stage}
                                                cards={cards.filter(c => c.pipeline_stage_id === stage.id)}
                                                phaseColor={phase.color}
                                            />
                                        ))}
                                    </KanbanPhaseGroup>
                                )
                            })}
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
                                    requiredRole={pendingMove.requiredRole}
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
                    </div>
                </DndContext>
            </div>

            {/* Footer - Part of flex layout, not fixed */}
            <div className="flex-shrink-0 h-16 bg-white/95 backdrop-blur-2xl border-t border-primary/10 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] flex items-center justify-between px-6 z-50">
                <div className="flex items-center gap-8">
                    <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">Total Pipeline</span>
                        <div className="flex items-baseline gap-3">
                            <span className="text-2xl font-bold text-primary-dark">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPipelineValue)}
                            </span>
                            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                {totalCards} cards
                            </span>
                        </div>
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-10 w-px bg-gray-200" />

                    {/* Quick Stats / Mini Forecast (Placeholder for now) */}
                    <div className="flex flex-col">
                        <span className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">Forecast Mês</span>
                        <span className="text-lg font-semibold text-gray-700">
                            R$ --
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Phase Summaries (Mini) */}
                    {displayPhases.map(phase => {
                        const phaseStages = stages.filter(s =>
                            s.phase_id === phase.id ||
                            (!s.phase_id && s.fase === phase.name)
                        )
                        if (phaseStages.length === 0) return null

                        const phaseCards = cards.filter(c => phaseStages.some(s => s.id === c.pipeline_stage_id))
                        const val = phaseCards.reduce((acc, c) => acc + (c.valor_estimado || 0), 0)
                        const count = phaseCards.length

                        return (
                            <div key={phase.id} className="flex flex-col items-end group cursor-default">
                                <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-0.5 group-hover:text-primary transition-colors">{phase.name}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-medium bg-gray-50 px-1.5 rounded">{count}</span>
                                    <span className="text-sm font-bold text-gray-700 group-hover:text-primary-dark transition-colors">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(val)}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
