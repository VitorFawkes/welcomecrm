import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Loader2, Plus, Layout } from 'lucide-react'
import { cn } from '../../../lib/utils'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent,
    type DropAnimation
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy
} from '@dnd-kit/sortable'
import { createPortal } from 'react-dom'

import PhaseColumn from './builder/PhaseColumn'
import StageCard from './builder/StageCard'
import StageInspectorDrawer from './StageInspectorDrawer'
import PhaseSettingsDrawer from './PhaseSettingsDrawer'
import { usePipelinePhases } from '../../../hooks/usePipelinePhases'
import type { Database } from '../../../database.types'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']
type PipelinePhase = Database['public']['Tables']['pipeline_phases']['Row']

export default function StudioStructure() {
    const queryClient = useQueryClient()
    const [activeId, setActiveId] = useState<string | null>(null)
    const [activeType, setActiveType] = useState<'Phase' | 'Stage' | null>(null)

    // Optimistic State
    const [localPhases, setLocalPhases] = useState<PipelinePhase[]>([])
    const [localStages, setLocalStages] = useState<PipelineStage[]>([])

    const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
    const [editingPhaseSettings, setEditingPhaseSettings] = useState<PipelinePhase | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 10 // Prevent accidental drags
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // --- Data Fetching ---
    const { data: phasesData, isLoading: loadingPhases } = usePipelinePhases()

    const { data: stagesData, isLoading: loadingStages } = useQuery({
        queryKey: ['pipeline-stages-studio'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('*')
                .order('ordem')
            if (error) throw error
            return data as PipelineStage[]
        }
    })

    // Sync state
    useEffect(() => {
        if (phasesData) setLocalPhases(phasesData)
    }, [phasesData])

    useEffect(() => {
        if (stagesData) setLocalStages(stagesData)
    }, [stagesData])

    // --- Mutations ---
    const updatePhaseMutation = useMutation({
        mutationFn: async (phase: Partial<PipelinePhase>) => {
            const { error } = await supabase.from('pipeline_phases').update(phase).eq('id', phase.id!)
            if (error) throw error
        },
        onMutate: async (newPhase) => {
            await queryClient.cancelQueries({ queryKey: ['pipeline-phases'] })
            const previousPhases = queryClient.getQueryData(['pipeline-phases'])
            queryClient.setQueryData(['pipeline-phases'], (old: any[] | undefined) => {
                if (!old) return []
                return old.map((p: any) => p.id === newPhase.id ? { ...p, ...newPhase } : p)
            })
            return { previousPhases }
        },
        onError: (err, _newPhase, context: any) => {
            console.error('Error updating phase:', err)
            if (context?.previousPhases) {
                queryClient.setQueryData(['pipeline-phases'], context.previousPhases)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-phases'] })
        }
    })

    const createPhaseMutation = useMutation({
        mutationFn: async (name: string) => {
            const maxOrder = Math.max(...localPhases.map(p => p.order_index), 0)
            const { error } = await supabase.from('pipeline_phases').insert({
                name,
                label: name,
                color: 'bg-gray-500',
                order_index: maxOrder + 1,
                active: true
            })
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline_phases'] })
    })

    const deletePhaseMutation = useMutation({
        mutationFn: async (id: string) => {
            // Check if empty
            const hasStages = localStages.some(s => s.phase_id === id)
            if (hasStages) throw new Error('Não é possível excluir uma fase que contém etapas. Mova as etapas primeiro.')

            const { error } = await supabase.from('pipeline_phases').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline_phases'] }),
        onError: (err) => alert(err.message)
    })

    const reorderPhasesMutation = useMutation({
        mutationFn: async (phases: PipelinePhase[]) => {
            const updates = phases.map((p, idx) => ({ id: p.id, order_index: idx + 1 }))
            for (const u of updates) {
                await supabase.from('pipeline_phases').update({ order_index: u.order_index }).eq('id', u.id)
            }
        }
    })

    const createStageMutation = useMutation({
        mutationFn: async ({ name, phaseId }: { name: string, phaseId: string }) => {
            const phase = localPhases.find(p => p.id === phaseId)
            const phaseStages = localStages.filter(s => s.phase_id === phaseId)
            const maxOrder = Math.max(...phaseStages.map(s => s.ordem || 0), 0)

            // Need a pipeline_id - grab from first stage or default
            const pipelineId = localStages[0]?.pipeline_id || 'default-pipeline-id' // Ideally fetch pipelines

            const { error } = await supabase.from('pipeline_stages').insert({
                nome: name,
                fase: phase?.name || 'SDR',
                phase_id: phaseId,
                ordem: maxOrder + 1,
                pipeline_id: pipelineId,
                ativo: true
            } as any)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages-studio'] })
    })

    const deleteStageMutation = useMutation({
        mutationFn: async (id: string) => {
            const { count, error: countError } = await supabase
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq('pipeline_stage_id', id)
            if (countError) throw countError
            if (count && count > 0) throw new Error(`Não é possível excluir etapa com ${count} cards ativos.`)

            const { error } = await supabase.from('pipeline_stages').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages-studio'] }),
        onError: (err) => alert(err.message)
    })

    const updateStageMutation = useMutation({
        mutationFn: async (stage: Partial<PipelineStage>) => {
            const { error } = await supabase.from('pipeline_stages').update(stage).eq('id', stage.id!)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pipeline-stages-studio'] })
    })

    // --- Dnd Handlers ---
    const onDragStart = (event: DragStartEvent) => {
        const { active } = event
        setActiveId(active.id as string)
        setActiveType(active.data.current?.type)
    }

    const onDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        const isActiveStage = active.data.current?.type === 'Stage'
        const isOverStage = over.data.current?.type === 'Stage'
        const isOverPhase = over.data.current?.type === 'Phase'

        if (!isActiveStage) return

        // Implements Stage dragging over other Stages or Phases
        if (isActiveStage && isOverStage) {
            setLocalStages((stages) => {
                const activeIndex = stages.findIndex((t) => t.id === activeId)
                const overIndex = stages.findIndex((t) => t.id === overId)

                if (stages[activeIndex].phase_id !== stages[overIndex].phase_id) {
                    // Moving to another phase
                    const newStages = [...stages]
                    newStages[activeIndex] = {
                        ...newStages[activeIndex],
                        phase_id: stages[overIndex].phase_id,
                        fase: localPhases.find(p => p.id === stages[overIndex].phase_id)?.name || 'Outro'
                    }
                    return arrayMove(newStages, activeIndex, overIndex - 1) // Insert before
                }
                return arrayMove(stages, activeIndex, overIndex)
            })
        }

        if (isActiveStage && isOverPhase) {
            setLocalStages((stages) => {
                const activeIndex = stages.findIndex((t) => t.id === activeId)
                if (stages[activeIndex].phase_id !== overId) {
                    const newStages = [...stages]
                    newStages[activeIndex] = {
                        ...newStages[activeIndex],
                        phase_id: overId as string,
                        fase: localPhases.find(p => p.id === overId)?.name || 'Outro'
                    }
                    return arrayMove(newStages, activeIndex, activeIndex) // Just update phase
                }
                return stages
            })
        }
    }

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        setActiveId(null)
        setActiveType(null)

        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        // Phase Reordering
        if (active.data.current?.type === 'Phase') {
            setLocalPhases((phases) => {
                const oldIndex = phases.findIndex((p) => p.id === activeId)
                const newIndex = phases.findIndex((p) => p.id === overId)
                const newPhases = arrayMove(phases, oldIndex, newIndex)
                reorderPhasesMutation.mutate(newPhases)
                return newPhases
            })
        }

        // Stage Reordering (Persistence)
        if (active.data.current?.type === 'Stage') {
            // The state is already updated in onDragOver, we just need to persist
            // We need to re-calculate orders for the affected phases
            const activeStage = localStages.find(s => s.id === activeId)
            if (activeStage) {
                // Find all stages in this phase and update their order
                // We rely on the fact that localStages array order reflects the visual order roughly
                // But arrayMove in onDragOver might not be perfect for persistence
                // Let's re-sort based on the array index

                // Actually, let's just trigger a full update for the affected phase(s)
                // This is a bit heavy but safe.
                // Ideally we send the new order of IDs to the backend.

                // For now, let's just update the single moved stage if it changed phase
                // And update orders if it changed position.

                // Simplest: Update ALL stages order based on current array index
                // Filter by phase first

                const updates: Partial<PipelineStage>[] = []
                localPhases.forEach(phase => {
                    const stagesInPhase = localStages.filter(s => s.phase_id === phase.id)
                    stagesInPhase.forEach((s, idx) => {
                        if (s.ordem !== idx + 1 || s.phase_id !== activeStage.phase_id) { // Check if changed
                            updates.push({ id: s.id, ordem: idx + 1, phase_id: phase.id, fase: phase.name })
                        }
                    })
                })

                // Batch update? Supabase doesn't have easy batch update.
                // Let's just update the ones that changed.
                updates.forEach(u => updateStageMutation.mutate(u))
            }
        }
    }

    const dropAnimation: DropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    }

    if (loadingPhases || loadingStages) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>

    return (
        <div className="h-full flex flex-col p-6 max-w-[1800px] mx-auto overflow-hidden">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Layout className="w-6 h-6 text-indigo-600" />
                        Construtor de Pipeline
                    </h2>
                    <p className="text-gray-500 mt-1">Gerencie macro-áreas e etapas visualmente.</p>
                </div>
                <button
                    onClick={() => {
                        const activePhasesCount = localPhases.filter(p => p.active && p.name !== 'Marketing').length
                        if (activePhasesCount >= 6) {
                            alert('Limite de gestão atingido (Máx. 6 áreas).')
                            return
                        }
                        const name = prompt('Nome da nova Macro-Área:')
                        if (name) createPhaseMutation.mutate(name)
                    }}
                    disabled={localPhases.filter(p => p.active && p.name !== 'Marketing').length >= 6}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm transition-all font-medium",
                        localPhases.filter(p => p.active && p.name !== 'Marketing').length >= 6
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-indigo-600 text-white hover:bg-indigo-700"
                    )}
                    title={localPhases.filter(p => p.active && p.name !== 'Marketing').length >= 4 ? "Limite de gestão atingido (Máx. 4 áreas)" : "Nova Macro-Área"}
                >
                    <Plus className="w-4 h-4" />
                    Nova Macro-Área
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
            >
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex gap-6 h-full min-w-max px-2">
                        <SortableContext items={localPhases.map(p => p.id)} strategy={horizontalListSortingStrategy}>
                            {localPhases.map(phase => (
                                <PhaseColumn
                                    key={phase.id}
                                    phase={phase}
                                    stages={localStages.filter(s => s.phase_id === phase.id)}
                                    onAddStage={() => {
                                        const name = prompt('Nome da nova etapa:')
                                        if (name) createStageMutation.mutate({ name, phaseId: phase.id })
                                    }}
                                    onEditPhase={() => {
                                        const name = prompt('Novo nome da fase:', phase.name)
                                        if (name) updatePhaseMutation.mutate({ id: phase.id, name, label: name })
                                    }}
                                    onDeletePhase={() => {
                                        if (confirm(`Excluir fase "${phase.name}"?`)) deletePhaseMutation.mutate(phase.id)
                                    }}
                                    onChangeColor={(color) => updatePhaseMutation.mutate({ id: phase.id, color })}
                                    onToggleVisibility={() => updatePhaseMutation.mutate({ id: phase.id, visible_in_card: !phase.visible_in_card })}
                                    onEditPhaseSettings={() => setEditingPhaseSettings(phase)}
                                    onEditStage={(stage) => setEditingStage(stage)}
                                    onDeleteStage={(stage) => {
                                        if (confirm(`Excluir etapa "${stage.nome}"?`)) deleteStageMutation.mutate(stage.id)
                                    }}
                                />
                            ))}
                        </SortableContext>
                    </div>
                </div>

                {createPortal(
                    <DragOverlay dropAnimation={dropAnimation}>
                        {activeId && activeType === 'Phase' && (
                            <PhaseColumn
                                phase={localPhases.find(p => p.id === activeId)!}
                                stages={localStages.filter(s => s.phase_id === activeId)}
                                onAddStage={() => { }}
                                onEditPhase={() => { }}
                                onDeletePhase={() => { }}
                                onEditStage={() => { }}
                                onDeleteStage={() => { }}
                                onChangeColor={() => { }}
                                onToggleVisibility={() => { }}
                                onEditPhaseSettings={() => { }}
                            />
                        )}
                        {activeId && activeType === 'Stage' && (
                            <StageCard
                                stage={localStages.find(s => s.id === activeId)!}
                                onEdit={() => { }}
                                onDelete={() => { }}
                            />
                        )}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>

            <StageInspectorDrawer
                isOpen={!!editingStage}
                onClose={() => setEditingStage(null)}
                stage={editingStage}
            />

            <PhaseSettingsDrawer
                isOpen={!!editingPhaseSettings}
                onClose={() => setEditingPhaseSettings(null)}
                phase={editingPhaseSettings}
            />
        </div>
    )
}
