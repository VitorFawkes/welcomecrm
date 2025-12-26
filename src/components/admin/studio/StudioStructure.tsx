import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Loader2, Plus, Trash2, GripVertical, Edit2 } from 'lucide-react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    type DragEndEvent
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '../../../lib/utils'
import StageInspectorDrawer from './StageInspectorDrawer'
import type { Database } from '../../../database.types'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']

export default function StudioStructure() {
    const queryClient = useQueryClient()
    const [localStages, setLocalStages] = useState<PipelineStage[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Fetch Stages
    const { data: stages, isLoading } = useQuery({
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

    useEffect(() => {
        if (stages) {
            setLocalStages(stages)
        }
    }, [stages])

    const createStageMutation = useMutation({
        mutationFn: async (newStage: Partial<PipelineStage>) => {
            const { error } = await supabase
                .from('pipeline_stages')
                .insert(newStage as any)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-stages-studio'] })
        }
    })

    const deleteStageMutation = useMutation({
        mutationFn: async (stageId: string) => {
            // Check for cards first
            const { count, error: countError } = await supabase
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq('pipeline_stage_id', stageId)

            if (countError) throw countError
            if (count && count > 0) throw new Error(`Não é possível excluir etapa com ${count} cards ativos. Mova-os primeiro.`)

            const { error } = await supabase
                .from('pipeline_stages')
                .delete()
                .eq('id', stageId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-stages-studio'] })
        },
        onError: (error) => {
            alert(error.message)
        }
    })

    const reorderStagesMutation = useMutation({
        mutationFn: async (stages: PipelineStage[]) => {
            const updates = stages.map((s, index) => ({
                id: s.id,
                ordem: index + 1
            }))

            for (const update of updates) {
                const { error } = await supabase
                    .from('pipeline_stages')
                    .update({ ordem: update.ordem })
                    .eq('id', update.id)
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-stages-studio'] })
        }
    })

    const handleAddStage = async () => {
        const name = prompt('Nome da nova etapa:')
        if (!name) return

        const maxOrder = Math.max(...localStages.map(s => s.ordem || 0), 0)
        const pipelineId = localStages[0]?.pipeline_id

        if (!pipelineId) {
            alert('Erro: Nenhum pipeline encontrado para vincular.')
            return
        }

        await createStageMutation.mutateAsync({
            nome: name,
            fase: 'SDR',
            ordem: maxOrder + 1,
            pipeline_id: pipelineId,
            ativo: true,
            is_won: false,
            is_lost: false
        })
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            setLocalStages((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id)
                const newIndex = items.findIndex((item) => item.id === over.id)
                const newItems = arrayMove(items, oldIndex, newIndex)

                // Trigger reorder mutation
                reorderStagesMutation.mutate(newItems)

                return newItems
            })
        }
        setActiveId(null)
    }

    if (isLoading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" /></div>

    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Gerenciamento de Pipeline</h2>
                    <p className="text-gray-500 mt-1">Arraste para reordenar ou clique para editar detalhes e regras.</p>
                </div>
                <button
                    onClick={handleAddStage}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm transition-all font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Nova Etapa
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(event) => setActiveId(event.active.id as string)}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={localStages.map(s => s.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-3">
                        {localStages.map((stage) => (
                            <SortableStageItem
                                key={stage.id}
                                stage={stage}
                                onEdit={() => setEditingStage(stage)}
                                onDelete={() => {
                                    if (confirm('Tem certeza que deseja excluir esta etapa?')) {
                                        deleteStageMutation.mutate(stage.id)
                                    }
                                }}
                            />
                        ))}
                    </div>
                </SortableContext>
                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-50">
                            <div className="bg-white p-4 rounded-xl border border-indigo-500 shadow-lg">
                                <span className="font-bold text-lg">
                                    {localStages.find(s => s.id === activeId)?.nome}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* STAGE INSPECTOR DRAWER */}
            <StageInspectorDrawer
                isOpen={!!editingStage}
                onClose={() => setEditingStage(null)}
                stage={editingStage}
            />
        </div>
    )
}

function SortableStageItem({ stage, onEdit, onDelete }: { stage: PipelineStage, onEdit: () => void, onDelete: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: stage.id })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: isDragging ? 'relative' as const : 'static' as const,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all",
                isDragging && "shadow-xl ring-2 ring-indigo-500 rotate-1 opacity-90"
            )}
        >
            <div className="flex items-center gap-4 flex-1">
                {/* Drag Handle */}
                <div
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                    <GripVertical className="w-5 h-5" />
                </div>

                {/* Color Indicator */}
                <div className={cn(
                    "w-3 h-12 rounded-full",
                    stage.fase === 'SDR' ? 'bg-blue-500' :
                        stage.fase === 'Planner' ? 'bg-purple-500' :
                            stage.fase === 'Pós-venda' ? 'bg-green-500' : 'bg-gray-500'
                )} />

                {/* Info */}
                <div className="flex-1 cursor-pointer" onClick={onEdit}>
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {stage.nome}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded">
                            {stage.fase}
                        </span>
                        {stage.ativo ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" /> Ativo
                            </span>
                        ) : (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" /> Inativo
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onEdit}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar Etapa"
                >
                    <Edit2 className="w-4 h-4" />
                </button>
                <button
                    onClick={onDelete}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir Etapa"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
