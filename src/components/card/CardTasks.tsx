import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { CheckSquare, Plus, Calendar, Trash2, Check, Clock, MapPin, Phone, Mail, MessageSquare, AlertCircle, RefreshCw, Play, FileText, RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useAuth } from '../../contexts/AuthContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/Button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import UserSelector from './UserSelector'
import ParticipantSelector, { type Participant } from './ParticipantSelector'

interface CardTasksProps {
    cardId: string
}

type TaskType = 'follow_up' | 'reuniao' | 'ligacao' | 'proposta' | 'outro' | 'solicitacao_mudanca'

interface BaseTask {
    id: string
    titulo: string
    created_at: string
    type_origin: 'tarefa' | 'reuniao'
    created_by: string | null
}

interface Tarefa extends BaseTask {
    type_origin: 'tarefa'
    data_vencimento: string
    concluida: boolean
    prioridade: 'baixa' | 'media' | 'alta'
    tipo: string
    descricao?: string
    concluida_em?: string | null
    responsavel_id?: string | null
    resultado?: string | null
    started_at?: string | null
    metadata?: any
}

interface Reuniao extends BaseTask {
    type_origin: 'reuniao'
    data_inicio: string
    data_fim: string | null
    local: string | null
    notas: string | null
    status: 'agendada' | 'realizada' | 'cancelada' | 'adiada'
    responsavel_id?: string | null
    participantes?: any // JSONB
    resultado?: string | null
    feedback?: string | null
    motivo_cancelamento?: string | null
    sdr_responsavel_id?: string | null
}

type UnifiedItem = Tarefa | Reuniao

export default function CardTasks({ cardId }: CardTasksProps) {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null)
    const [selectedType, setSelectedType] = useState<TaskType>('follow_up')

    // Form States
    const [title, setTitle] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [time, setTime] = useState('12:00')
    const [endTime, setEndTime] = useState('13:00')
    const [priority, setPriority] = useState<'baixa' | 'media' | 'alta'>('media')
    const [location, setLocation] = useState('')
    const [notes, setNotes] = useState('')
    const [status, setStatus] = useState<string>('agendada')
    const [responsavelId, setResponsavelId] = useState<string | null>(null)
    const [sdrResponsavelId, setSdrResponsavelId] = useState<string | null>(null)
    const [participantes, setParticipantes] = useState<Participant[]>([])

    // CRM Outcome States
    const [resultado, setResultado] = useState<string>('')
    const [feedback, setFeedback] = useState<string>('')
    const [motivoCancelamento, setMotivoCancelamento] = useState<string>('')
    const [changeReason, setChangeReason] = useState<string>('')

    // Add Next Steps State
    const [nextStepType, setNextStepType] = useState<'tarefa' | 'reuniao' | null>(null)

    // Fetch Tasks
    const { data: tasks = [] } = useQuery({
        queryKey: ['tasks', cardId],
        queryFn: async () => {
            const { data, error } = await (supabase.from('tarefas') as any)
                .select('*')
                .eq('card_id', cardId)
            if (error) throw error
            return (data || []).map((t: any) => ({ ...t, type_origin: 'tarefa' })) as Tarefa[]
        }
    })

    // Fetch Meetings
    const { data: meetings = [] } = useQuery({
        queryKey: ['meetings', cardId],
        queryFn: async () => {
            const { data, error } = await (supabase.from('reunioes') as any)
                .select('*')
                .eq('card_id', cardId)
            if (error) throw error
            return (data || []).map((m: any) => ({ ...m, type_origin: 'reuniao' })) as Reuniao[]
        }
    })

    // Fetch Card Details (to get SDR Owner)
    const { data: card } = useQuery({
        queryKey: ['card', cardId],
        queryFn: async () => {
            const { data, error } = await (supabase.from('cards') as any)
                .select('*')
                .eq('id', cardId)
                .single()
            if (error) throw error
            return data
        }
    })

    // Merge and Sort
    const allItems: UnifiedItem[] = [...tasks, ...meetings].sort((a, b) => {
        const dateA = a.type_origin === 'tarefa' ? (a as Tarefa).data_vencimento : (a as Reuniao).data_inicio
        const dateB = b.type_origin === 'tarefa' ? (b as Tarefa).data_vencimento : (b as Reuniao).data_inicio
        return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    const changeRequestItems = allItems.filter(item =>
        item.type_origin === 'tarefa' &&
        (item as Tarefa).tipo === 'solicitacao_mudanca' &&
        !(item as Tarefa).concluida
    )

    const pendingItems = allItems.filter(item => {
        if (item.type_origin === 'tarefa') {
            const t = item as Tarefa
            return !t.concluida && t.tipo !== 'solicitacao_mudanca'
        }
        if (item.type_origin === 'reuniao') return (item as Reuniao).status === 'agendada' || (item as Reuniao).status === 'adiada'
        return true
    })

    const completedItems = allItems.filter(item => {
        if (item.type_origin === 'tarefa') return (item as Tarefa).concluida
        if (item.type_origin === 'reuniao') return (item as Reuniao).status === 'realizada' || (item as Reuniao).status === 'cancelada'
        return false
    })

    // Enhanced Save Mutation
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Usuário não autenticado')
            const dateTime = `${date}T${time}:00`

            let payload: any = {}

            if (selectedType === 'reuniao') {
                const endDateTime = `${date}T${endTime}:00`
                payload = {
                    card_id: cardId,
                    titulo: title,
                    data_inicio: dateTime,
                    data_fim: endDateTime,
                    local: location,
                    notas: notes,
                    status: status,
                    created_by: editingItem ? undefined : user.id,
                    responsavel_id: responsavelId || user.id,
                    sdr_responsavel_id: sdrResponsavelId,
                    participantes: participantes,
                    resultado: status === 'realizada' ? resultado : null,
                    feedback: status === 'realizada' ? feedback : null,
                    motivo_cancelamento: status === 'cancelada' ? motivoCancelamento : null
                }

                if (editingItem) {
                    const { error } = await (supabase.from('reunioes') as any)
                        .update(payload)
                        .eq('id', editingItem.id)
                    if (error) throw error
                } else {
                    const { error } = await (supabase.from('reunioes') as any)
                        .insert(payload)
                    if (error) throw error
                }
            } else {
                // ... (keep task payload logic)
                payload = {
                    card_id: cardId,
                    titulo: title,
                    data_vencimento: dateTime,
                    prioridade: priority,
                    tipo: selectedType,
                    descricao: notes,
                    created_by: editingItem ? undefined : user.id,
                    responsavel_id: responsavelId || user.id,
                    resultado: resultado || null,
                    metadata: selectedType === 'solicitacao_mudanca' ? {
                        change_reason: changeReason,
                        original_stage_id: card?.stage_id,
                        original_owner_id: card?.dono_atual_id
                    } : null
                }

                if (editingItem) {
                    const { error } = await (supabase.from('tarefas') as any)
                        .update(payload)
                        .eq('id', editingItem.id)
                    if (error) throw error
                } else {
                    const { error } = await (supabase.from('tarefas') as any)
                        .insert({ ...payload, concluida: false })
                    if (error) throw error
                }
            }

            // Handle Next Steps (Auto-create follow-up)
            if (nextStepType) {
                // Logic to create a follow-up task/meeting would go here
                // For now, we'll just log it or maybe open the modal again for the new item
                // But to keep it simple for this step, let's just save the current one.
            }
        },
        onSuccess: async () => {
            // STEP 1: Cancel in-flight queries to prevent race conditions
            // (prevents old request from overwriting cache after we refetch)
            await queryClient.cancelQueries({ queryKey: ['card', cardId] })

            // STEP 2: Invalidate all related queries in parallel for speed
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tasks', cardId] }),
                queryClient.invalidateQueries({ queryKey: ['meetings', cardId] }),
                queryClient.invalidateQueries({ queryKey: ['cards'] }),
                queryClient.invalidateQueries({ queryKey: ['card', cardId] })
            ])

            // STEP 3: Force immediate refetch of card data (only active queries)
            // This ensures header re-renders with fresh data before modal closes
            await queryClient.refetchQueries({
                queryKey: ['card', cardId],
                type: 'active'  // Only refetch if component is mounted
            })

            if (nextStepType) {
                // If next step requested, reset form but keep modal open and set defaults for new task
                const newDate = new Date()
                newDate.setDate(newDate.getDate() + 2) // Default to 2 days later

                setEditingItem(null)
                setTitle(`Follow-up: ${title}`)
                setDate(newDate.toISOString().split('T')[0])
                setStatus('agendada')
                setResultado('')
                setFeedback('')
                setSelectedType(nextStepType === 'reuniao' ? 'reuniao' : 'follow_up')
                setNextStepType(null)
                // Don't close modal, let user edit the new follow-up
            } else {
                closeModal()
            }
        }
    })

    const toggleTaskMutation = useMutation({
        mutationFn: async ({ id, concluida }: { id: string, concluida: boolean }) => {
            const { error } = await (supabase.from('tarefas') as any)
                .update({ concluida, concluida_em: concluida ? new Date().toISOString() : null })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: async () => {
            // Cancel in-flight card queries to prevent race
            await queryClient.cancelQueries({ queryKey: ['card', cardId] })

            // Parallel invalidation for speed
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['tasks', cardId] }),
                queryClient.invalidateQueries({ queryKey: ['card', cardId] })
            ])

            // Refetch only if component is active
            await queryClient.refetchQueries({
                queryKey: ['card', cardId],
                type: 'active'
            })
        }
    })

    const deleteItemMutation = useMutation({
        mutationFn: async ({ id, type }: { id: string, type: 'tarefa' | 'reuniao' }) => {
            const table = type === 'tarefa' ? 'tarefas' : 'reunioes'
            const { error } = await (supabase.from(table) as any).delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
            queryClient.invalidateQueries({ queryKey: ['meetings', cardId] })
            queryClient.invalidateQueries({ queryKey: ['card', cardId] })
        }
    })

    const resetForm = () => {
        setTitle('')
        setDate(new Date().toISOString().split('T')[0])
        setTime('12:00')
        setEndTime('13:00')
        setPriority('media')
        setLocation('')
        setNotes('')
        setStatus('agendada')
        setSelectedType('follow_up')
        setResponsavelId(card?.dono_atual_id || user?.id || null)
        setSdrResponsavelId(card?.sdr_owner_id || null) // Default to Card SDR
        setParticipantes([])
        setResultado('')
        setFeedback('')
        setMotivoCancelamento('')
        setChangeReason('')
        setNextStepType(null)
    }

    const openModal = (item?: UnifiedItem, defaultType?: TaskType) => {
        if (item) {
            setEditingItem(item)
            setTitle(item.titulo)
            if (item.type_origin === 'reuniao') {
                const m = item as Reuniao
                setSelectedType('reuniao')
                setDate(m.data_inicio.split('T')[0])
                setTime(m.data_inicio.split('T')[1].substring(0, 5))
                setEndTime(m.data_fim ? m.data_fim.split('T')[1].substring(0, 5) : '13:00')
                setLocation(m.local || '')
                setNotes(m.notas || '')
                setStatus(m.status || 'agendada')
                setResponsavelId(m.responsavel_id || m.created_by || null)
                setSdrResponsavelId(m.sdr_responsavel_id || null)
                setParticipantes(Array.isArray(m.participantes) ? m.participantes : [])
                setResultado(m.resultado || '')
                setFeedback(m.feedback || '')
                setMotivoCancelamento(m.motivo_cancelamento || '')
            } else {
                const t = item as Tarefa
                setSelectedType(t.tipo as TaskType || 'follow_up')
                setDate(t.data_vencimento.split('T')[0])
                setTime(t.data_vencimento.split('T')[1].substring(0, 5))
                setPriority(t.prioridade)
                setNotes(t.descricao || '')
                setResponsavelId(t.responsavel_id || t.created_by || null)
                setParticipantes([])
                setResultado(t.resultado || '')
                setChangeReason(t.metadata?.change_reason || '')
            }
        } else {
            setEditingItem(null)
            resetForm()
            if (defaultType) setSelectedType(defaultType)
        }
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingItem(null)
        resetForm()
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'reuniao': return <Calendar className="h-4 w-4 text-purple-600" />
            case 'ligacao': return <Phone className="h-4 w-4 text-green-600" />
            case 'email': return <Mail className="h-4 w-4 text-blue-600" />
            case 'mensagem': return <MessageSquare className="h-4 w-4 text-indigo-600" />
            case 'proposta': return <FileText className="h-4 w-4 text-orange-600" />
            case 'follow_up': return <RotateCcw className="h-4 w-4 text-blue-500" />
            case 'solicitacao_mudanca': return <RefreshCw className="h-4 w-4 text-orange-600" />
            default: return <CheckSquare className="h-4 w-4 text-gray-500" />
        }
    }

    return (
        <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Tarefas e Compromissos</h3>
                <div className="flex gap-2">
                    <Button
                        onClick={() => openModal(undefined, 'follow_up')}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nova Tarefa
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                {/* Change Requests Section */}
                {changeRequestItems.length > 0 && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                            <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                                <RefreshCw className="h-3 w-3" />
                                Solicitações de Mudança ({changeRequestItems.length})
                            </h4>
                        </div>
                        {changeRequestItems.map(item => (
                            <div key={item.id} className="group flex flex-col gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 hover:shadow-md transition-all cursor-pointer" onClick={() => openModal(item)}>
                                <div className="flex items-start gap-3">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleTaskMutation.mutate({ id: item.id, concluida: true })
                                        }}
                                        className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-orange-300 text-orange-600 focus:ring-orange-500 hover:border-orange-500 flex items-center justify-center hover:bg-orange-100 transition-colors"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="h-4 w-4 text-orange-600" />
                                            <p className="text-sm font-medium text-gray-900">
                                                {item.titulo}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="h-3.5 w-3.5" />
                                                {format(new Date((item as Tarefa).data_vencimento), "dd/MM HH:mm")}
                                            </div>
                                        </div>
                                        {(item as Tarefa).metadata?.change_reason && (
                                            <div className="mt-2 p-2 bg-white/50 rounded border border-orange-100 text-xs text-gray-700 italic">
                                                "{(item as Tarefa).metadata.change_reason}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pending / Upcoming */}
                {pendingItems.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Próximos</h4>
                        {pendingItems.map(item => {
                            const isMeeting = item.type_origin === 'reuniao'
                            const dateStr = isMeeting ? (item as Reuniao).data_inicio : (item as Tarefa).data_vencimento
                            const isLate = new Date(dateStr) < new Date()

                            return (
                                <div key={item.id} className={cn(
                                    "group flex items-start gap-3 rounded-lg border p-3 hover:shadow-md transition-all cursor-pointer",
                                    isMeeting ? "bg-white border-purple-100 hover:border-purple-200" : "bg-white border-gray-300 hover:border-indigo-200"
                                )} onClick={() => openModal(item)}>
                                    {!isMeeting ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleTaskMutation.mutate({ id: item.id, concluida: true })
                                            }}
                                            className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-gray-300 text-indigo-600 focus:ring-indigo-500 hover:border-indigo-500 flex items-center justify-center hover:bg-indigo-50 transition-colors"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-purple-50 rounded-lg text-purple-700 shrink-0 border border-purple-100">
                                            <span className="text-[10px] font-bold uppercase">{format(new Date(dateStr), 'MMM', { locale: ptBR })}</span>
                                            <span className="text-sm font-bold">{new Date(dateStr).getDate()}</span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {isMeeting ? null : getTypeIcon((item as Tarefa).tipo || 'tarefa')}
                                            <p className={cn("text-sm font-medium text-gray-900", isLate && !isMeeting && "text-red-600")}>
                                                {item.titulo}
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                                            <div className={cn("flex items-center gap-1.5", isLate && !isMeeting && "text-red-600 font-medium")}>
                                                <Clock className="h-3.5 w-3.5" />
                                                {format(new Date(dateStr), "HH:mm")}
                                                {!isMeeting && ` • ${format(new Date(dateStr), "dd/MM")}`}
                                                {isMeeting && (item as Reuniao).data_fim && ` - ${format(new Date((item as Reuniao).data_fim!), "HH:mm")}`}
                                            </div>

                                            {isMeeting && (item as Reuniao).local && (
                                                <div className="flex items-center gap-1.5 truncate max-w-[150px]">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    {(item as Reuniao).local}
                                                </div>
                                            )}

                                            {!isMeeting && (item as Tarefa).prioridade === 'alta' && (
                                                <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded text-[10px] font-medium border border-red-100">
                                                    Alta Prioridade
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Completed / Past */}
                {completedItems.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Concluídos / Passados</h4>
                        {completedItems.map(item => {
                            const isMeeting = item.type_origin === 'reuniao'
                            const dateStr = isMeeting ? (item as Reuniao).data_inicio : (item as Tarefa).data_vencimento

                            return (
                                <div key={item.id} className="group flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 p-3 opacity-70 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => openModal(item)}>
                                    {!isMeeting ? (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                toggleTaskMutation.mutate({ id: item.id, concluida: false })
                                            }}
                                            className="mt-0.5 h-5 w-5 flex-shrink-0 rounded border border-gray-300 bg-indigo-50 text-indigo-600 focus:ring-indigo-500 flex items-center justify-center"
                                        >
                                            <Check className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 rounded-lg text-gray-500 shrink-0 grayscale border border-gray-300">
                                            <span className="text-[10px] font-bold uppercase">{format(new Date(dateStr), 'MMM', { locale: ptBR })}</span>
                                            <span className="text-sm font-bold">{new Date(dateStr).getDate()}</span>
                                        </div>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            {isMeeting ? null : getTypeIcon((item as Tarefa).tipo || 'tarefa')}
                                            <p className="text-sm font-medium text-gray-500 line-through decoration-gray-400">
                                                {item.titulo}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                            <span>{format(new Date(dateStr), "dd 'de' MMMM", { locale: ptBR })}</span>
                                            {isMeeting && (
                                                <span className={cn(
                                                    "px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                                    (item as Reuniao).status === 'realizada' ? "bg-green-50 text-green-700 border-green-100" : "bg-red-50 text-red-700 border-red-100"
                                                )}>
                                                    {(item as Reuniao).status}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            deleteItemMutation.mutate({ id: item.id, type: item.type_origin })
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {allItems.length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl bg-gray-50/50">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm mb-3">
                            <CheckSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <h4 className="text-sm font-medium text-gray-900">Nenhuma atividade</h4>
                        <p className="mt-1 text-xs text-gray-500">Crie tarefas ou agende reuniões para começar.</p>
                        <Button
                            onClick={() => openModal(undefined, 'follow_up')}
                            variant="default"
                            size="sm"
                            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            Agendar Próximo Passo
                        </Button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-4xl w-full block overflow-hidden p-0 bg-gray-50">
                    <div className="flex flex-col h-full max-h-[90vh]">
                        <DialogHeader className="px-6 py-4 bg-white border-b border-gray-300">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-xl font-semibold text-gray-900">
                                    {editingItem ? 'Detalhes da Tarefa' : 'Nova Tarefa'}
                                </DialogTitle>
                                {editingItem && (
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                            status === 'realizada' ? "bg-green-50 text-green-700 border-green-200" :
                                                status === 'cancelada' ? "bg-red-50 text-red-700 border-red-200" :
                                                    "bg-blue-50 text-blue-700 border-blue-200"
                                        )}>
                                            {status.charAt(0).toUpperCase() + status.slice(1)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </DialogHeader>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8">

                            {/* 1. O QUE (Type & Title) */}
                            <section className="space-y-4">
                                {!editingItem && (
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {(['follow_up', 'ligacao', 'reuniao', 'proposta', 'solicitacao_mudanca', 'outro'] as TaskType[]).map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setSelectedType(type)}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap",
                                                    selectedType === type
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                        : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                                                )}
                                            >
                                                {getTypeIcon(type)}
                                                {type === 'solicitacao_mudanca' ? 'Mudança' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', '-')}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div>
                                    <input
                                        type="text"
                                        placeholder={selectedType === 'reuniao' ? "Ex: Reunião de Apresentação" : "Ex: Enviar proposta"}
                                        className="w-full text-lg font-medium border-0 border-b border-gray-300 bg-transparent px-0 py-2 focus:ring-0 focus:border-indigo-500 focus:outline-none placeholder:text-gray-400"
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        autoFocus={!editingItem}
                                    />
                                </div>

                                {selectedType === 'solicitacao_mudanca' && (
                                    <div className="animate-in fade-in slide-in-from-top-2">
                                        <label className="text-xs font-medium text-orange-700 mb-1 block">
                                            Motivo da mudança solicitada pelo cliente *
                                        </label>
                                        <textarea
                                            placeholder="Descreva o motivo da mudança..."
                                            className="w-full px-3 py-2.5 rounded-lg border border-orange-200 bg-orange-50 text-sm focus:ring-orange-500 focus:border-orange-500 min-h-[80px]"
                                            value={changeReason}
                                            onChange={e => setChangeReason(e.target.value)}
                                        />
                                    </div>
                                )}
                            </section>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Left: Planning Details */}
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-300 shadow-sm space-y-4">
                                        <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-gray-500" />
                                            Agendamento
                                        </h4>

                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            <div className="col-span-1">
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Data</label>
                                                <input
                                                    type="date"
                                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    value={date}
                                                    onChange={e => setDate(e.target.value)}
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Início</label>
                                                <input
                                                    type="time"
                                                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                    value={time}
                                                    onChange={e => setTime(e.target.value)}
                                                />
                                            </div>
                                            {selectedType === 'reuniao' && (
                                                <div className="col-span-1">
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Fim</label>
                                                    <input
                                                        type="time"
                                                        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        value={endTime}
                                                        onChange={e => setEndTime(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {selectedType === 'reuniao' && (
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 mb-1 block">Local / Link</label>
                                                <div className="relative">
                                                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="Adicionar local ou link da reunião"
                                                        className="w-full pl-9 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                                        value={location}
                                                        onChange={e => setLocation(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">
                                                {selectedType === 'reuniao' ? "Pauta / Notas" : "Descrição"}
                                            </label>
                                            <textarea
                                                placeholder="Adicione detalhes..."
                                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 min-h-[100px] resize-none"
                                                value={notes}
                                                onChange={e => setNotes(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {selectedType === 'reuniao' && (
                                        <div className="bg-white p-5 rounded-xl border border-gray-300 shadow-sm">
                                            <ParticipantSelector
                                                label="Participantes"
                                                value={participantes}
                                                onChange={setParticipantes}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Right: Status & Outcome */}
                                <div className="space-y-6">
                                    <div className="bg-white p-5 rounded-xl border border-gray-300 shadow-sm space-y-4">
                                        <h4 className="text-sm font-semibold text-gray-900">Status & Responsável</h4>

                                        <div>
                                            <label className="text-xs font-medium text-gray-500 mb-1 block">Status Atual</label>
                                            <select
                                                className={cn(
                                                    "w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:ring-indigo-500 focus:border-indigo-500 font-medium",
                                                    status === 'realizada' ? "text-green-700 bg-green-50 border-green-300" :
                                                        status === 'cancelada' ? "text-red-700 bg-red-50 border-red-300" :
                                                            "text-gray-700"
                                                )}
                                                value={status}
                                                onChange={e => setStatus(e.target.value)}
                                            >
                                                <option value="agendada">📅 Agendada</option>
                                                <option value="realizada">✅ Realizada</option>
                                                <option value="cancelada">❌ Cancelada</option>
                                                <option value="adiada">⏰ Adiada</option>
                                            </select>
                                        </div>

                                        <div>
                                            <UserSelector
                                                label={selectedType === 'reuniao' ? "Responsável (Quem fará a reunião?)" : "Responsável"}
                                                currentUserId={responsavelId}
                                                onSelect={setResponsavelId}
                                            />
                                        </div>

                                        {selectedType === 'reuniao' && (
                                            <div>
                                                <UserSelector
                                                    label="SDR Responsável (Opcional)"
                                                    currentUserId={sdrResponsavelId}
                                                    onSelect={setSdrResponsavelId}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Outcome Section - Only visible if Realizada/Cancelada */}
                                    {(status === 'realizada' || status === 'cancelada') && (
                                        <div className={cn(
                                            "p-5 rounded-xl border shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2",
                                            status === 'realizada' ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                                        )}>
                                            <h4 className={cn(
                                                "text-sm font-semibold flex items-center gap-2",
                                                status === 'realizada' ? "text-green-800" : "text-red-800"
                                            )}>
                                                {status === 'realizada' ? <CheckSquare className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                                                {status === 'realizada' ? "Conclusão" : "Cancelamento"}
                                            </h4>

                                            {status === 'realizada' ? (
                                                <>
                                                    <div>
                                                        <label className="text-xs font-medium text-green-700 mb-1 block">Resultado</label>
                                                        <select
                                                            className="w-full rounded-lg border-green-200 bg-white text-sm focus:ring-green-500 focus:border-green-500"
                                                            value={resultado}
                                                            onChange={e => setResultado(e.target.value)}
                                                        >
                                                            <option value="">Selecione...</option>
                                                            <option value="sucesso">🚀 Sucesso / Avançou</option>
                                                            <option value="neutro">😐 Neutro / Em Andamento</option>
                                                            <option value="sem_interesse">👎 Sem Interesse</option>
                                                            <option value="no_show">👻 No Show</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-green-700 mb-1 block">Feedback / Resumo</label>
                                                        <textarea
                                                            className="w-full rounded-lg border-green-200 bg-white text-sm focus:ring-green-500 focus:border-green-500 min-h-[80px]"
                                                            placeholder="Resumo importante..."
                                                            value={feedback}
                                                            onChange={e => setFeedback(e.target.value)}
                                                        />
                                                    </div>

                                                    {/* Next Steps Toggle */}
                                                    <div className="pt-2 border-t border-green-200/50">
                                                        <label className="text-xs font-medium text-green-800 mb-2 block">Próximos Passos?</label>
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setNextStepType(nextStepType === 'tarefa' ? null : 'tarefa')}
                                                                className={cn(
                                                                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all",
                                                                    nextStepType === 'tarefa'
                                                                        ? "bg-green-600 text-white border-green-600"
                                                                        : "bg-white text-green-700 border-green-200 hover:bg-green-100"
                                                                )}
                                                            >
                                                                + Tarefa
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setNextStepType(nextStepType === 'reuniao' ? null : 'reuniao')}
                                                                className={cn(
                                                                    "flex-1 py-2 px-3 rounded-lg text-xs font-medium border transition-all",
                                                                    nextStepType === 'reuniao'
                                                                        ? "bg-green-600 text-white border-green-600"
                                                                        : "bg-white text-green-700 border-green-200 hover:bg-green-100"
                                                                )}
                                                            >
                                                                + Reunião
                                                            </button>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div>
                                                    <label className="text-xs font-medium text-red-700 mb-1 block">Motivo</label>
                                                    <textarea
                                                        className="w-full rounded-lg border-red-200 bg-white text-sm focus:ring-red-500 focus:border-red-500 min-h-[80px]"
                                                        placeholder="Por que foi cancelada?"
                                                        value={motivoCancelamento}
                                                        onChange={e => setMotivoCancelamento(e.target.value)}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="px-6 py-4 bg-white border-t border-gray-300 flex justify-between items-center">
                            {editingItem && editingItem.type_origin === 'tarefa' && !(editingItem as Tarefa).started_at && !(editingItem as Tarefa).concluida && (
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        if (!editingItem) return
                                        const { error } = await supabase.from('tarefas').update({ started_at: new Date().toISOString() }).eq('id', editingItem.id)
                                        if (!error) {
                                            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
                                            closeModal()
                                        }
                                    }}
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50 gap-2 mr-auto"
                                >
                                    <Play className="h-4 w-4" />
                                    Iniciar Execução
                                </Button>
                            )}
                            <div className="flex gap-2 ml-auto">
                                <Button variant="outline" onClick={closeModal}>
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={() => saveMutation.mutate()}
                                    disabled={!title || saveMutation.isPending}
                                    className={cn(
                                        "text-white min-w-[100px]",
                                        status === 'realizada' ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"
                                    )}
                                >
                                    {saveMutation.isPending ? (
                                        <Clock className="h-4 w-4 animate-spin" />
                                    ) : (
                                        nextStepType ? 'Salvar e Criar Próxima' : 'Salvar'
                                    )}
                                </Button>
                            </div>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}

