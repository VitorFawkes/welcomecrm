import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { CheckSquare, Plus, Calendar, Trash2, Check, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface CardTasksProps {
    cardId: string
}

interface Task {
    id: string
    titulo: string
    data_vencimento: string
    concluida: boolean
    prioridade: 'baixa' | 'media' | 'alta'
    tipo: string
}

import { useAuth } from '../../contexts/AuthContext'

export default function CardTasks({ cardId }: CardTasksProps) {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [isAdding, setIsAdding] = useState(false)
    const [newTask, setNewTask] = useState({
        titulo: '',
        data_vencimento: new Date().toISOString().split('T')[0],
        hora_vencimento: '12:00',
        prioridade: 'media' as const,
        tipo: 'outro'
    })

    const { data: tasks, isLoading } = useQuery({
        queryKey: ['tasks', cardId],
        queryFn: async () => {
            const { data, error } = await (supabase.from('tarefas') as any)
                .select('*')
                .eq('card_id', cardId)
                .order('concluida', { ascending: true })
                .order('data_vencimento', { ascending: true })

            if (error) throw error
            return data as Task[]
        }
    })

    const addTaskMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Usuário não autenticado')

            const dataVencimento = `${newTask.data_vencimento}T${newTask.hora_vencimento}:00`
            const { error } = await (supabase.from('tarefas') as any)
                .insert({
                    card_id: cardId,
                    titulo: newTask.titulo,
                    data_vencimento: dataVencimento,
                    prioridade: newTask.prioridade,
                    tipo: newTask.tipo,
                    concluida: false,
                    responsavel_id: user.id
                })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
            queryClient.invalidateQueries({ queryKey: ['cards'] }) // Refresh kanban indicators
            setIsAdding(false)
            setNewTask({
                titulo: '',
                data_vencimento: new Date().toISOString().split('T')[0],
                hora_vencimento: '12:00',
                prioridade: 'media',
                tipo: 'outro'
            })
        }
    })

    const toggleTaskMutation = useMutation({
        mutationFn: async ({ id, concluida }: { id: string, concluida: boolean }) => {
            const { error } = await (supabase.from('tarefas') as any)
                .update({
                    concluida,
                    concluida_em: concluida ? new Date().toISOString() : null
                })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
        }
    })

    const deleteTaskMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from('tarefas') as any)
                .delete()
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
        }
    })

    const pendingTasks = tasks?.filter(t => !t.concluida) || []
    const completedTasks = tasks?.filter(t => t.concluida) || []

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Tarefas</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4" />
                    Nova Tarefa
                </button>
            </div>

            {isAdding && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 mb-4">
                    <input
                        type="text"
                        placeholder="O que precisa ser feito?"
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={newTask.titulo}
                        onChange={e => setNewTask({ ...newTask, titulo: e.target.value })}
                        autoFocus
                    />
                    <div className="flex gap-3">
                        <input
                            type="date"
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            value={newTask.data_vencimento}
                            onChange={e => setNewTask({ ...newTask, data_vencimento: e.target.value })}
                        />
                        <input
                            type="time"
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            value={newTask.hora_vencimento}
                            onChange={e => setNewTask({ ...newTask, hora_vencimento: e.target.value })}
                        />
                        <select
                            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            value={newTask.prioridade}
                            onChange={e => setNewTask({ ...newTask, prioridade: e.target.value as any })}
                        >
                            <option value="baixa">Baixa</option>
                            <option value="media">Média</option>
                            <option value="alta">Alta</option>
                        </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={() => addTaskMutation.mutate()}
                            disabled={!newTask.titulo}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            Adicionar
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    <div className="text-center py-8 text-gray-500">Carregando tarefas...</div>
                ) : tasks?.length === 0 && !isAdding ? (
                    <div className="text-center py-8">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                            <CheckSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <h4 className="mt-2 text-sm font-medium text-gray-900">Nenhuma tarefa</h4>
                        <p className="mt-1 text-xs text-gray-500">Comece adicionando tarefas para este card.</p>
                    </div>
                ) : (
                    <>
                        {pendingTasks.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pendentes</h4>
                                {pendingTasks.map(task => {
                                    const isLate = new Date(task.data_vencimento) < new Date()
                                    return (
                                        <div key={task.id} className="group flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 hover:shadow-sm transition-shadow">
                                            <button
                                                onClick={() => toggleTaskMutation.mutate({ id: task.id, concluida: true })}
                                                className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-gray-300 text-blue-600 focus:ring-blue-500 hover:border-blue-500 flex items-center justify-center"
                                            >
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-sm font-medium text-gray-900", isLate && "text-red-600")}>
                                                    {task.titulo}
                                                </p>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                    <div className={cn("flex items-center gap-1", isLate && "text-red-600 font-medium")}>
                                                        {isLate ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                                                        {new Date(task.data_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {task.prioridade === 'alta' && (
                                                        <span className="text-red-600 font-medium">Alta Prioridade</span>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => deleteTaskMutation.mutate(task.id)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {completedTasks.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Concluídas</h4>
                                {completedTasks.map(task => (
                                    <div key={task.id} className="group flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50 p-3 opacity-75">
                                        <button
                                            onClick={() => toggleTaskMutation.mutate({ id: task.id, concluida: false })}
                                            className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-gray-300 bg-blue-50 text-blue-600 focus:ring-blue-500 flex items-center justify-center"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-500 line-through">
                                                {task.titulo}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => deleteTaskMutation.mutate(task.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-opacity"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
