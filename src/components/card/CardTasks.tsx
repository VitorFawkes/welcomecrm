import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { CheckSquare, Plus, Calendar, Trash2, Check, Clock, MapPin, Phone, Mail, MessageSquare, AlertCircle } from 'lucide-react'
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

type TaskType = 'tarefa' | 'reuniao' | 'ligacao' | 'email' | 'mensagem' | 'outro'

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
}

type UnifiedItem = Tarefa | Reuniao

export default function CardTasks({ cardId }: CardTasksProps) {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<UnifiedItem | null>(null)
    const [selectedType, setSelectedType] = useState<TaskType>('tarefa')

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
    const [participantes, setParticipantes] = useState<Participant[]>([])

    // CRM Outcome States
    const [resultado, setResultado] = useState<string>('')
    const [feedback, setFeedback] = useState<string>('')
    const [motivoCancelamento, setMotivoCancelamento] = useState<string>('')

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

    // Merge and Sort
    const allItems: UnifiedItem[] = [...tasks, ...meetings].sort((a, b) => {
        const dateA = a.type_origin === 'tarefa' ? (a as Tarefa).data_vencimento : (a as Reuniao).data_inicio
        const dateB = b.type_origin === 'tarefa' ? (b as Tarefa).data_vencimento : (b as Reuniao).data_inicio
        return new Date(dateA).getTime() - new Date(dateB).getTime()
    })

    const pendingItems = allItems.filter(item => {
        if (item.type_origin === 'tarefa') return !(item as Tarefa).concluida
        if (item.type_origin === 'reuniao') return (item as Reuniao).status === 'agendada' || (item as Reuniao).status === 'adiada'
        return true
    })

    const completedItems = allItems.filter(item => {
        if (item.type_origin === 'tarefa') return (item as Tarefa).concluida
        if (item.type_origin === 'reuniao') return (item as Reuniao).status === 'realizada' || (item as Reuniao).status === 'cancelada'
        return false
    })

    // Mutations
    const saveMutation = useMutation({
        mutationFn: async () => {
            if (!user) throw new Error('Usuário não autenticado')
            const dateTime = `${date}T${time}:00`

            if (selectedType === 'reuniao') {
                const endDateTime = `${date}T${endTime}:00`
                const payload = {
                    card_id: cardId,
                    titulo: title,
                    data_inicio: dateTime,
                    data_fim: endDateTime,
                    local: location,
                    notas: notes,
                    status: status,
                    created_by: editingItem ? undefined : user.id,
                    responsavel_id: responsavelId || user.id,
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
                const payload = {
                    card_id: cardId,
                    titulo: title,
                    data_vencimento: dateTime,
                    prioridade: priority,
                    tipo: selectedType,
                    descricao: notes,
                    created_by: editingItem ? undefined : user.id,
                    responsavel_id: responsavelId || user.id,
                    resultado: resultado || null
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
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
            queryClient.invalidateQueries({ queryKey: ['meetings', cardId] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            closeModal()
        }
    })

    const toggleTaskMutation = useMutation({
        mutationFn: async ({ id, concluida }: { id: string, concluida: boolean }) => {
            const { error } = await (supabase.from('tarefas') as any)
                .update({ concluida, concluida_em: concluida ? new Date().toISOString() : null })
                .eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] })
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
        }
    })

    const openModal = (item?: UnifiedItem) => {
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
                setParticipantes(Array.isArray(m.participantes) ? m.participantes : [])
                setResultado(m.resultado || '')
                setFeedback(m.feedback || '')
                setMotivoCancelamento(m.motivo_cancelamento || '')
            } else {
                const t = item as Tarefa
                setSelectedType(t.tipo as TaskType || 'tarefa')
                setDate(t.data_vencimento.split('T')[0])
                setTime(t.data_vencimento.split('T')[1].substring(0, 5))
                setPriority(t.prioridade)
                setNotes(t.descricao || '')
                setResponsavelId(t.responsavel_id || t.created_by || null)
                setParticipantes([])
                setResultado(t.resultado || '')
            }
        } else {
            setEditingItem(null)
            resetForm()
        }
        setIsModalOpen(true)
    }

    const closeModal = () => {
        setIsModalOpen(false)
        setEditingItem(null)
        resetForm()
    }

    const resetForm = () => {
        setTitle('')
        setDate(new Date().toISOString().split('T')[0])
        setTime('12:00')
        setEndTime('13:00')
        setPriority('media')
        setLocation('')
        setNotes('')
        setStatus('agendada')
        setSelectedType('tarefa')
        setResponsavelId(user?.id || null)
        setParticipantes([])
        setResultado('')
        setFeedback('')
        setMotivoCancelamento('')
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'reuniao': return <Calendar className="h-4 w-4 text-purple-600" />
            case 'ligacao': return <Phone className="h-4 w-4 text-green-600" />
            case 'email': return <Mail className="h-4 w-4 text-blue-600" />
            case 'mensagem': return <MessageSquare className="h-4 w-4 text-indigo-600" />
            default: return <CheckSquare className="h-4 w-4 text-gray-500" />
        }
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Tarefas e Compromissos</h3>
                <Button
                    onClick={() => openModal()}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Novo
                </Button>
            </div>

            <div className="space-y-6">
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
                                    isMeeting ? "bg-white border-purple-100 hover:border-purple-200" : "bg-white border-gray-200 hover:border-indigo-200"
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
                                        <div className="flex flex-col items-center justify-center w-10 h-10 bg-gray-100 rounded-lg text-gray-500 shrink-0 grayscale border border-gray-200">
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
                            onClick={() => openModal()}
                            variant="outline"
                            size="sm"
                            className="mt-4"
                        >
                            Criar Atividade
                        </Button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-4xl w-full block overflow-hidden p-0">
                    <div className="p-6 space-y-6">
                        <DialogHeader>
                            <DialogTitle className="text-xl">{editingItem ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6 w-full min-w-0">
                            {/* Type Selector */}
                            {!editingItem && (
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full max-w-full">
                                    {(['tarefa', 'reuniao', 'ligacao', 'email', 'mensagem', 'outro'] as TaskType[]).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedType(type)}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all whitespace-nowrap flex-shrink-0",
                                                selectedType === type
                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200 shadow-sm"
                                                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                                            )}
                                        >
                                            {getTypeIcon(type)}
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Left Column: Core Info */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 mb-1.5 block">Título</label>
                                        <input
                                            type="text"
                                            placeholder={selectedType === 'reuniao' ? "Ex: Reunião de Apresentação" : "Ex: Enviar proposta"}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Data</label>
                                            <input
                                                type="date"
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                                                value={date}
                                                onChange={e => setDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Início</label>
                                            <input
                                                type="time"
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                                                value={time}
                                                onChange={e => setTime(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {selectedType === 'reuniao' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Fim</label>
                                                <input
                                                    type="time"
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                                                    value={endTime}
                                                    onChange={e => setEndTime(e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Local / Link</label>
                                                <input
                                                    type="text"
                                                    placeholder="Link ou Endereço"
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                                                    value={location}
                                                    onChange={e => setLocation(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right Column: CRM Details */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        {selectedType === 'reuniao' ? (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Status</label>
                                                <select
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                                                    value={status}
                                                    onChange={e => setStatus(e.target.value)}
                                                >
                                                    <option value="agendada">Agendada</option>
                                                    <option value="realizada">Realizada</option>
                                                    <option value="cancelada">Cancelada</option>
                                                    <option value="adiada">Adiada</option>
                                                </select>
                                            </div>
                                        ) : (
                                            <div>
                                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">Prioridade</label>
                                                <select
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5"
                                                    value={priority}
                                                    onChange={e => setPriority(e.target.value as any)}
                                                >
                                                    <option value="baixa">Baixa</option>
                                                    <option value="media">Média</option>
                                                    <option value="alta">Alta</option>
                                                </select>
                                            </div>
                                        )}

                                        <div>
                                            <UserSelector
                                                label="Responsável"
                                                currentUserId={responsavelId}
                                                onSelect={setResponsavelId}
                                            />
                                        </div>
                                    </div>

                                    {selectedType === 'reuniao' && (
                                        <div>
                                            <ParticipantSelector
                                                label="Participantes (Internos e Convidados)"
                                                value={participantes}
                                                onChange={setParticipantes}
                                            />
                                        </div>
                                    )}

                                    {/* CRM Outcome Fields */}
                                    {selectedType === 'reuniao' && status === 'realizada' && (
                                        <div className="bg-green-50 p-3 rounded-lg border border-green-100 space-y-3">
                                            <h4 className="text-xs font-semibold text-green-800 flex items-center gap-1.5">
                                                <CheckSquare className="h-3.5 w-3.5" />
                                                Conclusão da Reunião
                                            </h4>
                                            <div>
                                                <label className="text-xs font-medium text-green-700 mb-1 block">Resultado</label>
                                                <select
                                                    className="w-full rounded border-green-200 text-sm py-1.5 focus:border-green-500 focus:ring-green-500"
                                                    value={resultado}
                                                    onChange={e => setResultado(e.target.value)}
                                                >
                                                    <option value="">Selecione...</option>
                                                    <option value="sucesso">Sucesso / Avançou</option>
                                                    <option value="sem_interesse">Sem Interesse</option>
                                                    <option value="no_show">Cliente não compareceu (No Show)</option>
                                                    <option value="remarcada">Precisa Remarcar</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-medium text-green-700 mb-1 block">Feedback / Resumo</label>
                                                <textarea
                                                    className="w-full rounded border-green-200 text-sm py-1.5 focus:border-green-500 focus:ring-green-500 min-h-[60px]"
                                                    placeholder="Resumo do que foi conversado..."
                                                    value={feedback}
                                                    onChange={e => setFeedback(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {selectedType === 'reuniao' && status === 'cancelada' && (
                                        <div className="bg-red-50 p-3 rounded-lg border border-red-100 space-y-3">
                                            <h4 className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5" />
                                                Motivo do Cancelamento
                                            </h4>
                                            <textarea
                                                className="w-full rounded border-red-200 text-sm py-1.5 focus:border-red-500 focus:ring-red-500 min-h-[60px]"
                                                placeholder="Por que foi cancelada?"
                                                value={motivoCancelamento}
                                                onChange={e => setMotivoCancelamento(e.target.value)}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1.5 block">
                                    {selectedType === 'reuniao' ? "Pauta / Notas" : "Descrição"}
                                </label>
                                <textarea
                                    placeholder="Adicione detalhes..."
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm py-2.5 min-h-[120px]"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button variant="outline" onClick={closeModal}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={!title || saveMutation.isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {saveMutation.isPending ? (
                                    <>
                                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                                        Salvando...
                                    </>
                                ) : (
                                    'Salvar'
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
