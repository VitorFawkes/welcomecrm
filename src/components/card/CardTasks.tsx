import { useState } from 'react'
import { Plus, CheckCircle2, Circle, Calendar, Phone, Users, FileCheck, MoreHorizontal, User, Trash2, Edit2, Check, RefreshCw, CalendarClock, XCircle, MessageSquare } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { SmartTaskModal } from './SmartTaskModal'
import { format, isToday, isPast, isTomorrow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Label } from '../ui/label'
import { Textarea } from '../ui/textarea'

interface CardTasksProps {
    cardId: string
}

export default function CardTasks({ cardId }: CardTasksProps) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTask, setEditingTask] = useState<any>(null)
    const [modalMode, setModalMode] = useState<'create' | 'edit' | 'reschedule'>('create')

    // Outcome Modal State
    const [outcomeModalOpen, setOutcomeModalOpen] = useState(false)
    const [taskToComplete, setTaskToComplete] = useState<any>(null)
    const [outcomeResult, setOutcomeResult] = useState<string>('realizada')
    const [outcomeFeedback, setOutcomeFeedback] = useState('')

    const queryClient = useQueryClient()

    // Fetch tasks
    const { data: tasks, isLoading: isLoadingTasks } = useQuery({
        queryKey: ['tasks', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tarefas')
                .select('*')
                .eq('card_id', cardId)
                .is('deleted_at', null) // Respect soft delete
                .order('data_vencimento', { ascending: true })

            if (error) throw error

            // Custom sort: Active first, then by Created At DESC (Newest First)
            return data.sort((a, b) => {
                // 1. Active vs Completed
                const aIsActive = !a.concluida;
                const bIsActive = !b.concluida;

                if (aIsActive && !bIsActive) return -1;
                if (!aIsActive && bIsActive) return 1;

                // 2. Sort by Created At DESC
                const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;

                return timeB - timeA;
            });
        },
        staleTime: 1000 * 60 // 1 minute
    })

    // Fetch Task Outcomes
    const { data: outcomes } = useQuery({
        queryKey: ['task-outcomes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('task_type_outcomes')
                .select('*')
                .order('ordem')
            if (error) throw error
            return data
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    })

    // Fetch profiles to map names (avoiding join ambiguity)
    const { data: profiles } = useQuery({
        queryKey: ['profiles-list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nome, email')

            if (error) throw error
            return data
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    const getResponsibleName = (id: string) => {
        if (!profiles) return null
        const profile = profiles.find(p => p.id === id)
        return profile ? (profile.nome || profile.email) : null
    }

    // Mutations
    const updateTaskMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
            const { error } = await supabase
                .from('tarefas')
                .update(updates)
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
            queryClient.invalidateQueries({ queryKey: ['card-detail', cardId] }) // Update header counts
            queryClient.invalidateQueries({ queryKey: ['card-tasks-completed', cardId] }) // Update requirements
        },
        onError: () => {
            toast.error('Erro ao atualizar tarefa')
        }
    })

    const handleToggleComplete = (task: any) => {
        const isCompleted = !task.concluida

        // Intercept Completion if outcomes exist for this type
        const taskOutcomes = outcomes?.filter((o: any) => o.tipo === task.tipo) || []

        if (isCompleted && taskOutcomes.length > 0) {
            setTaskToComplete(task)
            setOutcomeResult(taskOutcomes[0].outcome_key)
            setOutcomeFeedback('')
            setOutcomeModalOpen(true)
            return
        }

        const updates = {
            concluida: isCompleted,
            status: isCompleted ? 'concluida' : 'pendente', // Simple mapping, can be refined for meetings/proposals
            concluida_em: isCompleted ? new Date().toISOString() : null
        }

        // Optimistic UI could be added here, but for now relying on fast invalidation
        updateTaskMutation.mutate({ id: task.id, updates })
        toast.success(isCompleted ? 'Item concluído!' : 'Item reaberto!')
    }

    const handleDelete = (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return

        updateTaskMutation.mutate({
            id,
            updates: { deleted_at: new Date().toISOString() }
        }, {
            onSuccess: () => toast.success('Item excluído')
        })
    }

    const handleEdit = (task: any) => {
        setEditingTask(task)
        setModalMode('edit')
        setIsModalOpen(true)
    }

    const handleReschedule = (task: any) => {
        setEditingTask(task)
        setModalMode('reschedule')
        setIsModalOpen(true)
    }

    const handleCloseModal = () => {
        setIsModalOpen(false)
        setEditingTask(null)
        setModalMode('create')
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'reuniao': return <Users className="w-4 h-4 text-purple-600" />
            case 'enviar_proposta': return <FileCheck className="w-4 h-4 text-green-600" />
            case 'followup': return <Phone className="w-4 h-4 text-blue-600" />
            case 'ligacao': return <Phone className="w-4 h-4 text-cyan-600" />
            case 'solicitacao_mudanca': return <RefreshCw className="w-4 h-4 text-orange-600" />
            case 'tarefa': return <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            default: return <MoreHorizontal className="w-4 h-4 text-gray-500" />
        }
    }

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'reuniao': return 'Reunião'
            case 'enviar_proposta': return 'Proposta'
            case 'followup': return 'Follow-up'
            case 'ligacao': return 'Ligação'
            case 'solicitacao_mudanca': return 'Mudança de Destino'
            case 'tarefa': return 'Tarefa'
            default: return type?.replace('_', ' ')
        }
    }

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'reuniao': return 'bg-purple-50 border-purple-100 text-purple-700'
            case 'enviar_proposta': return 'bg-green-50 border-green-100 text-green-700'
            case 'followup': return 'bg-blue-50 border-blue-100 text-blue-700'
            case 'ligacao': return 'bg-cyan-50 border-cyan-100 text-cyan-700'
            case 'solicitacao_mudanca': return 'bg-orange-50 border-orange-100 text-orange-700'
            default: return 'bg-gray-50 border-gray-100 text-gray-700'
        }
    }

    const isRescheduled = (task: any) => task.rescheduled_from_id !== null

    const formatTaskDate = (dateStr: string) => {
        const date = new Date(dateStr)
        if (isToday(date)) return 'Hoje'
        if (isTomorrow(date)) return 'Amanhã'
        return format(date, "dd/MM", { locale: ptBR })
    }

    const renderOutcomeButtons = (filteredOutcomes: any[]) => {
        return filteredOutcomes.map((outcome: any) => (
            <button
                key={outcome.outcome_key}
                onClick={() => setOutcomeResult(outcome.outcome_key)}
                className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${outcomeResult === outcome.outcome_key
                    ? 'border-indigo-500 bg-indigo-50/50 text-indigo-700 shadow-sm'
                    : 'border-gray-100 bg-white text-gray-600 hover:border-indigo-200 hover:bg-indigo-50/30'
                    }`}
            >
                <div className={`p-2 rounded-full ${outcomeResult === outcome.outcome_key ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                    {outcome.is_success ? (
                        <CheckCircle2 className={`w-5 h-5 ${outcomeResult === outcome.outcome_key ? 'text-indigo-600' : 'text-gray-500'}`} />
                    ) : (
                        <XCircle className={`w-5 h-5 ${outcomeResult === outcome.outcome_key ? 'text-indigo-600' : 'text-gray-500'}`} />
                    )}
                </div>
                <span className="font-medium text-sm">{outcome.outcome_label}</span>
                {outcomeResult === outcome.outcome_key && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                )}
            </button>
        ))
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-gray-500" />
                    Agenda & Tarefas
                    {tasks && tasks.length > 0 && (
                        <span className="bg-gray-200 text-gray-700 text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                            {tasks.filter((t: any) => !t.concluida).length}
                        </span>
                    )}
                </h3>
                <button
                    onClick={() => { setEditingTask(null); setModalMode('create'); setIsModalOpen(true); }}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Item
                </button>
            </div>

            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {isLoadingTasks ? (
                    <div className="p-8 flex flex-col items-center gap-3">
                        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs text-gray-500">Carregando agenda...</p>
                    </div>
                ) : tasks?.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50/30">
                        <div className="w-10 h-10 bg-white border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                            <CheckCircle2 className="w-5 h-5 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-900">Tudo em dia!</p>
                        <p className="text-xs text-gray-500 mt-1">Nenhuma tarefa pendente para este card.</p>
                        <button
                            onClick={() => { setEditingTask(null); setModalMode('create'); setIsModalOpen(true); }}
                            className="text-xs text-indigo-600 font-medium mt-3 hover:underline"
                        >
                            Agendar próxima etapa
                        </button>
                    </div>
                ) : (
                    tasks?.map((task: any) => {
                        const isLate = isPast(new Date(task.data_vencimento)) && !isToday(new Date(task.data_vencimento)) && !task.concluida
                        const responsibleName = task.responsavel_id ? getResponsibleName(task.responsavel_id) : null

                        return (
                            <div
                                key={task.id}
                                onClick={() => handleEdit(task)}
                                className={`p-3 hover:bg-gray-50 transition-colors group relative cursor-pointer ${task.concluida ? (isRescheduled(task) ? 'opacity-75 bg-gray-50/30' : 'opacity-60 bg-gray-50/50') : ''}`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Checkbox / Toggle */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleToggleComplete(task); }}
                                        className={`mt-0.5 flex-shrink-0 transition-colors ${task.concluida ? 'text-green-500' : 'text-gray-300 hover:text-green-500'}`}
                                    >
                                        {task.concluida ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                                    </button>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                            <p className={`text-sm font-medium text-gray-900 truncate pr-2 ${task.concluida && !isRescheduled(task) ? 'line-through text-gray-500' : ''}`}>
                                                {task.titulo}
                                            </p>
                                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 capitalize ${getTypeColor(task.tipo)} flex items-center gap-1`}>
                                                {getTypeIcon(task.tipo)}
                                                {getTypeLabel(task.tipo)}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                            {/* Date & Time */}
                                            {task.data_vencimento && (
                                                <div className={`flex items-center gap-1.5 text-xs ${isLate ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>
                                                        {formatTaskDate(task.data_vencimento)}
                                                        <span className="mx-1 text-gray-300">|</span>
                                                        {format(new Date(task.data_vencimento), "HH:mm")}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Responsible (Only for Meetings) */}
                                            {task.tipo === 'reuniao' && responsibleName && (
                                                <div className="flex items-center gap-1.5 text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                                    <User className="w-3 h-3" />
                                                    <span className="truncate max-w-[100px]">{responsibleName}</span>
                                                </div>
                                            )}

                                            {/* Rescheduled Badge */}
                                            {isRescheduled(task) && (
                                                <div className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded border border-violet-200">
                                                    <CalendarClock className="w-3 h-3" />
                                                    <span className="font-medium">Reagendada</span>
                                                </div>
                                            )}

                                            {/* Outcome Badge */}
                                            {task.concluida && task.resultado && (
                                                <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${task.resultado === 'realizada' ? 'text-green-600 bg-green-50 border-green-200' :
                                                    task.resultado === 'cancelada' ? 'text-red-600 bg-red-50 border-red-200' :
                                                        task.resultado === 'adiada' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                                                            'text-gray-600 bg-gray-50 border-gray-200'
                                                    }`}>
                                                    <span className="font-medium capitalize">{task.resultado.replace('_', ' ')}</span>
                                                </div>
                                            )}
                                        </div>

                                        {task.descricao && (
                                            <p className="text-xs text-gray-500 mt-1.5 line-clamp-1">
                                                {task.descricao}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions Menu */}
                                    <DropdownMenu.Root>
                                        <DropdownMenu.Trigger asChild>
                                            <button
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <MoreHorizontal className="w-4 h-4" />
                                            </button>
                                        </DropdownMenu.Trigger>
                                        <DropdownMenu.Portal>
                                            <DropdownMenu.Content className="min-w-[140px] bg-white rounded-lg shadow-lg border border-gray-100 p-1 z-50 animate-in fade-in zoom-in-95 duration-100" sideOffset={5}>
                                                <DropdownMenu.Item
                                                    onClick={(e) => { e.stopPropagation(); handleEdit(task); }}
                                                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-indigo-600 rounded cursor-pointer outline-none"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                    Editar
                                                </DropdownMenu.Item>
                                                <DropdownMenu.Item
                                                    onClick={() => handleReschedule(task)}
                                                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-orange-600 rounded cursor-pointer outline-none"
                                                >
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    Re-agendar
                                                </DropdownMenu.Item>
                                                <DropdownMenu.Item
                                                    onClick={() => handleToggleComplete(task)}
                                                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-green-600 rounded cursor-pointer outline-none"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    {task.concluida ? 'Reabrir' : 'Concluir'}
                                                </DropdownMenu.Item>
                                                <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />
                                                <DropdownMenu.Item
                                                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                                    className="flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer outline-none"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    Excluir
                                                </DropdownMenu.Item>
                                            </DropdownMenu.Content>
                                        </DropdownMenu.Portal>
                                    </DropdownMenu.Root>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            <SmartTaskModal
                cardId={cardId}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                initialData={editingTask}
                mode={modalMode}
            />

            <Dialog open={outcomeModalOpen} onOpenChange={setOutcomeModalOpen}>
                <DialogContent className="sm:max-w-[500px] p-0 gap-0 max-h-[85vh] flex flex-col">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-gray-50 bg-gray-50/30 flex-shrink-0">
                        <DialogTitle className="text-xl font-semibold text-gray-900">Como foi a reunião?</DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">Registre o resultado para manter o histórico atualizado.</p>
                    </DialogHeader>

                    <div className="p-6 space-y-6 overflow-y-auto">
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Resultado</Label>
                            <div className="w-full">
                                {taskToComplete?.tipo === 'contato' ? (
                                    <div className="space-y-5">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-green-700 bg-green-50 w-fit px-2 py-1 rounded border border-green-100">
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>WHATSAPP</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {renderOutcomeButtons(outcomes?.filter((o: any) => ['respondido', 'visualizado', 'enviado'].includes(o.outcome_key)) || [])}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-cyan-700 bg-cyan-50 w-fit px-2 py-1 rounded border border-cyan-100">
                                                <Phone className="w-3.5 h-3.5" />
                                                <span>LIGAÇÃO</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                {renderOutcomeButtons(outcomes?.filter((o: any) => ['atendeu', 'nao_atendeu', 'caixa_postal', 'numero_invalido'].includes(o.outcome_key)) || [])}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-3">
                                        {taskToComplete && renderOutcomeButtons(outcomes?.filter((o: any) => o.tipo === taskToComplete.tipo) || [])}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="outcome-feedback" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                Feedback / Observações
                            </Label>
                            <Textarea
                                id="outcome-feedback"
                                value={outcomeFeedback}
                                onChange={(e) => setOutcomeFeedback(e.target.value)}
                                placeholder="Descreva os pontos principais, próximos passos ou motivos do cancelamento..."
                                className="min-h-[100px] resize-none border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50/30"
                            />
                        </div>
                    </div>

                    <DialogFooter className="px-6 py-4 bg-gray-50 border-t border-gray-100 sm:justify-between items-center">
                        <Button variant="ghost" onClick={() => setOutcomeModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => {
                                if (!taskToComplete) return
                                const updates = {
                                    concluida: true,
                                    status: 'concluida',
                                    concluida_em: new Date().toISOString(),
                                    resultado: outcomeResult, // Legacy support
                                    outcome: outcomeResult, // New Workflow Trigger
                                    feedback: outcomeFeedback
                                }
                                updateTaskMutation.mutate({ id: taskToComplete.id, updates })
                                toast.success('Item concluído com sucesso!')
                                setOutcomeModalOpen(false)
                                setTaskToComplete(null)
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 shadow-sm transition-all hover:shadow-md"
                        >
                            Confirmar Conclusão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
