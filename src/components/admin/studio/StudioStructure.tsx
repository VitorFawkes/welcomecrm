import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabase'
import { Loader2, Plus, Trash2, Clock, AlertCircle, Shield, GripVertical, Check, Save } from 'lucide-react'
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
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
import type { Database } from '../../../database.types'

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row']

// Sortable Item Component
function SortableStageItem({
    stage,
    index,
    handleUpdateStage,
    handleSaveStage,
    handleDeleteStage
}: {
    stage: PipelineStage
    index: number
    handleUpdateStage: (id: string, updates: Partial<PipelineStage>) => void
    handleSaveStage: (stage: PipelineStage) => void
    handleDeleteStage: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: stage.id })

    const [isSaving, setIsSaving] = useState(false)
    const [showSaved, setShowSaved] = useState(false)

    const onSave = async () => {
        setIsSaving(true)
        await handleSaveStage(stage)
        setIsSaving(false)
        setShowSaved(true)
        setTimeout(() => setShowSaved(false), 2000)
    }

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as const
    }

    return (
        <div ref={setNodeRef} style={style} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-4">
            {/* Header Row */}
            <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded-md text-gray-400 hover:text-gray-700 transition-colors border border-transparent hover:border-gray-200"
                    >
                        <GripVertical className="w-6 h-6" />
                    </div>
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {index + 1}
                    </div>
                    <div className="flex-1">
                        <input
                            value={stage.nome}
                            onChange={(e) => handleUpdateStage(stage.id, { nome: e.target.value })}
                            onBlur={onSave}
                            className="font-semibold text-gray-900 border-none p-0 focus:ring-0 bg-transparent text-lg w-full hover:bg-gray-100 rounded px-2 transition-colors"
                            placeholder="Nome da Etapa"
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <select
                                value={stage.fase || 'SDR'}
                                onChange={(e) => {
                                    const updates = { fase: e.target.value }
                                    handleUpdateStage(stage.id, updates)
                                    handleSaveStage({ ...stage, ...updates })
                                }}
                                className="text-xs text-gray-500 uppercase tracking-wider border-none bg-gray-100 rounded px-2 py-0.5 cursor-pointer hover:bg-gray-200"
                            >
                                <option value="SDR">SDR</option>
                                <option value="Planner">Planner</option>
                                <option value="Pós-venda">Pós-venda</option>
                                <option value="Outro">Outro</option>
                            </select>
                            {stage.is_won && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">Ganho</span>}
                            {stage.is_lost && <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">Perdido</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 pl-4 border-l border-gray-100 ml-4">
                    {isSaving && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                    {showSaved && !isSaving && (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 animate-in fade-in slide-in-from-left-1">
                            <Check className="w-3 h-3" /> Salvo
                        </span>
                    )}
                    <button
                        onClick={() => handleDeleteStage(stage.id)}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-md transition-colors"
                        title="Excluir Etapa"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Details Row */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left: SLA & Description */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            SLA (Horas)
                        </label>
                        <input
                            type="number"
                            value={stage.sla_hours || ''}
                            onChange={(e) => handleUpdateStage(stage.id, { sla_hours: e.target.value ? parseInt(e.target.value) : null })}
                            onBlur={onSave}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            placeholder="Ex: 24"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-gray-400" />
                            Descrição / Instruções
                        </label>
                        <textarea
                            value={stage.description || ''}
                            onChange={(e) => handleUpdateStage(stage.id, { description: e.target.value })}
                            onBlur={onSave}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            rows={3}
                            placeholder="Instruções para o time..."
                        />
                    </div>
                </div>

                {/* Right: Governance */}
                <div className="space-y-4 border-l pl-8 border-gray-100">
                    <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2 mb-4">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        Governança & Regras
                    </h4>

                    <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={stage.is_won || false}
                                onChange={(e) => {
                                    const updates = { is_won: e.target.checked, is_lost: false }
                                    handleUpdateStage(stage.id, updates)
                                    handleSaveStage({ ...stage, ...updates })
                                    // Trigger visual feedback manually since this isn't onBlur
                                    setShowSaved(true)
                                    setTimeout(() => setShowSaved(false), 2000)
                                }}
                                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">Marcar como Ganho (Won)</span>
                        </label>

                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={stage.is_lost || false}
                                onChange={(e) => {
                                    const updates = { is_lost: e.target.checked, is_won: false }
                                    handleUpdateStage(stage.id, updates)
                                    handleSaveStage({ ...stage, ...updates })
                                    setShowSaved(true)
                                    setTimeout(() => setShowSaved(false), 2000)
                                }}
                                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">Marcar como Perdido (Lost)</span>
                        </label>

                        <div className="pt-2">
                            <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
                                Role Obrigatória
                            </label>
                            <select
                                value={stage.target_role || ''}
                                onChange={(e) => {
                                    const updates = { target_role: e.target.value || null }
                                    handleUpdateStage(stage.id, updates)
                                    handleSaveStage({ ...stage, ...updates })
                                }}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            >
                                <option value="">Qualquer (Manter Atual)</option>
                                <option value="sdr">SDR</option>
                                <option value="vendas">Vendas (Planner)</option>
                                <option value="concierge">Concierge</option>
                            </select>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <span className="text-sm text-gray-500">Status da Etapa</span>
                            <button
                                onClick={() => {
                                    const updates = { ativo: !stage.ativo }
                                    handleUpdateStage(stage.id, updates)
                                    handleSaveStage({ ...stage, ...updates })
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${stage.ativo ? 'bg-green-500' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${stage.ativo ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function StudioStructure() {
    const queryClient = useQueryClient()
    const [localStages, setLocalStages] = useState<PipelineStage[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)

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

    const saveStageMutation = useMutation({
        mutationFn: async (stage: PipelineStage) => {
            const { error } = await supabase
                .from('pipeline_stages')
                .update({
                    sla_hours: stage.sla_hours,
                    description: stage.description,
                    nome: stage.nome,
                    fase: stage.fase,
                    is_won: stage.is_won,
                    is_lost: stage.is_lost,
                    target_role: stage.target_role,
                    ativo: stage.ativo
                })
                .eq('id', stage.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-stages-studio'] })
        }
    })

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

    const handleUpdateStage = (stageId: string, updates: Partial<PipelineStage>) => {
        setLocalStages(prev => prev.map(s => s.id === stageId ? { ...s, ...updates } : s))
    }

    const handleSaveStage = async (stage: PipelineStage) => {
        try {
            await saveStageMutation.mutateAsync(stage)
        } catch (error) {
            console.error(error)
            alert('Erro ao salvar etapa')
        }
    }

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

    const handleDeleteStage = async (stageId: string) => {
        if (!confirm('Tem certeza? Esta ação não pode ser desfeita.')) return
        await deleteStageMutation.mutateAsync(stageId)
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
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">Gerenciamento de Etapas</h2>
                <button
                    onClick={handleAddStage}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
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
                    <div className="space-y-4">
                        {localStages.map((stage, index) => (
                            <SortableStageItem
                                key={stage.id}
                                stage={stage}
                                index={index}
                                handleUpdateStage={handleUpdateStage}
                                handleSaveStage={handleSaveStage}
                                handleDeleteStage={handleDeleteStage}
                            />
                        ))}
                    </div>
                </SortableContext>
                <DragOverlay>
                    {activeId ? (
                        <div className="opacity-50">
                            {/* Simplified overlay for better performance */}
                            <div className="bg-white p-4 rounded-lg border border-blue-500 shadow-lg">
                                <span className="font-bold text-lg">
                                    {localStages.find(s => s.id === activeId)?.nome}
                                </span>
                            </div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    )
}
