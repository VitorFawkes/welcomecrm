import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
    CheckCircle2,
    Phone,
    Users,
    RefreshCw,
    FileCheck,
    MessageSquare,
    Mail,
    ArrowLeft,
    ChevronDown,
    Check
} from 'lucide-react';
import { MultiSelectEmail } from '@/components/ui/MultiSelectEmail';

interface SmartTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardId: string;
    initialData?: any; // For edit mode
    mode?: 'create' | 'edit' | 'reschedule';
}

type TaskType = 'tarefa' | 'contato' | 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'solicitacao_mudanca' | 'enviar_proposta';

const TASK_TYPES: { id: TaskType; label: string; icon: any; color: string; activeColor: string }[] = [
    { id: 'tarefa', label: 'Tarefa', icon: CheckCircle2, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', activeColor: 'ring-2 ring-indigo-500 bg-indigo-100' },
    { id: 'contato', label: 'Contato', icon: Phone, color: 'text-blue-600 bg-blue-50 border-blue-200', activeColor: 'ring-2 ring-blue-500 bg-blue-100' },
    { id: 'email', label: 'E-mail', icon: Mail, color: 'text-blue-600 bg-blue-50 border-blue-200', activeColor: 'ring-2 ring-blue-500 bg-blue-100' },
    { id: 'reuniao', label: 'Reunião', icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-200', activeColor: 'ring-2 ring-purple-500 bg-purple-100' },
    { id: 'solicitacao_mudanca', label: 'Mudança', icon: RefreshCw, color: 'text-orange-600 bg-orange-50 border-orange-200', activeColor: 'ring-2 ring-orange-500 bg-orange-100' },
    { id: 'enviar_proposta', label: 'Proposta', icon: FileCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', activeColor: 'ring-2 ring-emerald-500 bg-emerald-100' },
];

const TEMPLATES: Record<TaskType, string> = {
    tarefa: "Ex: Enviar briefing por e-mail...",
    contato: "Ex: Realizar contato inicial...",
    ligacao: "Ex: Ligar para confirmar detalhes...",
    whatsapp: "Ex: WhatsApp para follow-up...",
    email: "Ex: E-mail com proposta...",
    reuniao: "Ex: Reunião de alinhamento...",
    solicitacao_mudanca: "Ex: Mudança de destino / hotel...",
    enviar_proposta: "Ex: Enviar proposta..."
};

export function SmartTaskModal({ isOpen, onClose, cardId, initialData, mode = 'create' }: SmartTaskModalProps) {
    // Step 1: Type Selection, Step 2: Form
    const [step, setStep] = useState<1 | 2>(1);

    // Common Fields
    const [type, setType] = useState<TaskType>('tarefa');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [responsibleId, setResponsibleId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    // Meeting Specifics
    const [meetingStatus, setMeetingStatus] = useState('agendada');
    const [meetingResult, setMeetingResult] = useState('');
    const [meetingFeedback, setMeetingFeedback] = useState('');
    const [cancellationReason, setCancellationReason] = useState('');

    // Rescheduling
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [rescheduleTime, setRescheduleTime] = useState('');

    // Change Request Specifics
    const [otherCategory, setOtherCategory] = useState('');

    // Meeting Specifics (New)
    const [externalParticipants, setExternalParticipants] = useState<string[]>([]);

    // Refs for native pickers
    const dateInputRef = useRef<HTMLInputElement>(null);
    const rescheduleDateInputRef = useRef<HTMLInputElement>(null);

    // Time Combobox State
    const [showRescheduleTimeList, setShowRescheduleTimeList] = useState(false);
    const rescheduleTimeListRef = useRef<HTMLDivElement>(null);

    // Metadata Fields
    const [metadata, setMetadata] = useState<any>({});

    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    // Fetch profiles for responsible selection
    const { data: profiles } = useQuery({
        queryKey: ['profiles-list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, nome, email')
                .order('nome');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    // Fetch Change Categories
    const { data: changeCategories } = useQuery({
        queryKey: ['activity-categories', 'change_request'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activity_categories')
                .select('key, label')
                .eq('scope', 'change_request')
                .eq('visible', true)
                .order('label');

            if (error) {
                // Fallback if table doesn't exist yet or error
                console.warn("Could not fetch categories, using defaults", error);
                return [
                    { key: 'voo', label: 'Voo' },
                    { key: 'hotel', label: 'Hotel' },
                    { key: 'datas', label: 'Datas' },
                    { key: 'financeiro', label: 'Financeiro' },
                    { key: 'outro', label: 'Outro' }
                ];
            }
            return data;
        },
        staleTime: 1000 * 60 * 60 // 1 hour
    });

    // Generate time options (every 15 minutes)
    const timeOptions = Array.from({ length: 96 }).map((_, i) => {
        const totalMinutes = i * 15;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const label = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        return { value: label, label };
    });

    // Helper to format local date/time strings
    const formatLocalDate = (dateObj: Date) => {
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const formatLocalTime = (dateObj: Date) => {
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const mm = String(dateObj.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
    };

    const profileOptions = profiles?.map(p => ({
        value: p.id,
        label: p.nome || p.email || 'Sem nome'
    })) || [];

    // Reset or populate form
    useEffect(() => {
        if (isOpen) {
            if (initialData || mode === 'reschedule') {
                // Edit or Reschedule mode
                setStep(2);
                setTitle(initialData?.titulo || '');
                setDescription(initialData?.descricao || '');
                setType((initialData?.tipo as TaskType) || 'tarefa');
                setResponsibleId(initialData?.responsavel_id || '');
                setMetadata(initialData?.metadata || {});

                // Meeting fields
                setMeetingStatus(initialData?.status || 'agendada');
                setMeetingResult(initialData?.resultado || '');
                setMeetingFeedback(initialData?.feedback || '');
                setCancellationReason(initialData?.motivo_cancelamento || '');
                setOtherCategory(initialData?.categoria_outro || '');
                setExternalParticipants(initialData?.participantes_externos || []);

                if (initialData?.data_vencimento && mode !== 'reschedule') {
                    const dt = new Date(initialData.data_vencimento);
                    setDate(formatLocalDate(dt));
                    const minutes = dt.getMinutes();
                    const roundedMinutes = Math.round(minutes / 15) * 15;
                    dt.setMinutes(roundedMinutes);
                    setTime(formatLocalTime(dt));
                } else {
                    // In reschedule mode (or create with initialData?), default to today/now for the user to pick new date
                    // Or maybe pre-fill old date to let them shift it?
                    // Usually reschedule means "Pick a new date". Let's default to today to be easier,
                    // or keep old date if they just want to change time?
                    // Let's default to Today+Now for Reschedule to encourage moving it forward.
                    const now = new Date();
                    const minutes = now.getMinutes();
                    const roundedMinutes = Math.ceil(minutes / 15) * 15;
                    now.setMinutes(roundedMinutes);

                    setDate(formatLocalDate(now));
                    setTime(formatLocalTime(now));
                }
            } else {
                // Create mode - Reset everything
                setStep(1);
                setTitle('Tarefa'); // Default title

                setDescription('');
                setType('tarefa');
                setMetadata({});
                setResponsibleId('');
                setMeetingStatus('agendada');
                setMeetingResult('');
                setMeetingFeedback('');
                setCancellationReason('');
                setOtherCategory('');
                setExternalParticipants([]);
                setRescheduleDate('');
                setRescheduleTime('');

                // Defaults: Today + Now (rounded to next 15 min)
                const now = new Date();
                const minutes = now.getMinutes();
                const roundedMinutes = Math.ceil(minutes / 15) * 15;
                now.setMinutes(roundedMinutes);

                setDate(formatLocalDate(now));
                setTime(formatLocalTime(now));
            }
        }
    }, [isOpen, initialData, mode]);

    // Close time list when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (rescheduleTimeListRef.current && !rescheduleTimeListRef.current.contains(event.target as Node)) {
                setShowRescheduleTimeList(false);
            }
        };

        if (showRescheduleTimeList) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showRescheduleTimeList]);

    const handleTypeSelect = (selectedType: TaskType) => {
        // Reset metadata when switching types to avoid stale state
        setMetadata({});
        setOtherCategory('');

        // Update type
        setType(selectedType);
        setStep(2);

        // Reset title if it's empty or matches a known template (meaning user hasn't customized it)
        if (!initialData) {
            const typeLabel = TASK_TYPES.find(t => t.id === selectedType)?.label || '';
            setTitle(typeLabel);
        }
    };

    const updateMetadata = (key: string, value: any) => {
        setMetadata((prev: any) => ({ ...prev, [key]: value }));

        // Clear other category if category changes
        if (key === 'change_category' && value !== 'outro') {
            setOtherCategory('');
        }
    };

    const handleWrapperClick = (ref: React.RefObject<HTMLInputElement | null>) => {
        if (ref.current) {
            ref.current.focus();
        }
    };



    const handleRescheduleTimeSelect = (timeValue: string) => {
        setRescheduleTime(timeValue);
        setShowRescheduleTimeList(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Combine date and time
            let finalDate = null;
            if (date && time) {
                finalDate = new Date(`${date}T${time}:00`).toISOString();
            } else if (date) {
                finalDate = new Date(`${date}T09:00:00`).toISOString(); // Default to 9am
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            // Determine responsible
            let finalResponsibleId = responsibleId;
            if (type !== 'reuniao') {
                finalResponsibleId = user?.id || '';
            }

            // Validation: Meeting requires explicit responsible
            if (type === 'reuniao' && !finalResponsibleId) {
                throw new Error("Para reuniões, é obrigatório selecionar um responsável.");
            }

            if (!finalResponsibleId) {
                finalResponsibleId = initialData?.responsavel_id || user?.id;
                if (!finalResponsibleId) throw new Error("Não foi possível identificar o responsável.");
            }

            // Validations for Meeting Status
            if (type === 'reuniao') {
                if (meetingStatus === 'realizada' && (!meetingResult || !meetingFeedback)) {
                    throw new Error("Para reuniões realizadas, Resultado e Feedback são obrigatórios.");
                }
                if (meetingStatus === 'cancelada' && !cancellationReason) {
                    throw new Error("Para reuniões canceladas, o Motivo do Cancelamento é obrigatório.");
                }
                if (meetingStatus === 'reagendada' && (!rescheduleDate || !rescheduleTime)) {
                    throw new Error("Para reagendar, é necessário informar a nova data e hora.");
                }
            }

            // Validation for Change Request
            if (type === 'solicitacao_mudanca') {
                if (metadata.change_category === 'outro' && !otherCategory) {
                    throw new Error("Por favor, especifique a categoria 'Outro'.");
                }
            }

            // Prepare payload
            const payload: any = {
                card_id: cardId,
                titulo: title,
                descricao: description,
                tipo: type,
                data_vencimento: finalDate,
                responsavel_id: finalResponsibleId,
                status: type === 'reuniao' ? meetingStatus : 'pendente',
                concluida: type === 'reuniao' ? ['realizada', 'cancelada', 'nao_compareceu', 'reagendada'].includes(meetingStatus) : false,
                metadata: metadata,
                feedback: meetingFeedback || null,
                motivo_cancelamento: cancellationReason || null,
                resultado: meetingResult || null,
                categoria_outro: otherCategory || null,
                // Map status to outcome for workflow triggering
                outcome: type === 'reuniao' && ['realizada', 'cancelada', 'nao_compareceu'].includes(meetingStatus)
                    ? meetingStatus
                    : (type === 'reuniao' && meetingStatus === 'reagendada' ? 'remarcada' : null)
            };

            // Only add participantes_externos if it's a meeting and has values
            if (type === 'reuniao' && externalParticipants.length > 0) {
                payload.participantes_externos = externalParticipants;
            } else {
                payload.participantes_externos = null; // Or empty array, but null is safer if column is nullable
            }

            // Debug Logging
            console.log('Saving Payload:', JSON.stringify(payload, null, 2));

            if (type === 'reuniao' && meetingStatus === 'realizada') {
                payload.concluida_em = new Date().toISOString();
            }

            let error;
            let newMeetingId = null;

            // Handle Rescheduling Logic
            if (type === 'reuniao' && meetingStatus === 'reagendada') {
                // 1. Create NEW meeting with ORIGINAL data + NEW date
                const newDate = new Date(`${rescheduleDate}T${rescheduleTime}:00`).toISOString();

                // A NOVA reunião herda dados ORIGINAIS da tarefa antiga + nova data
                // Isso preserva o título, descrição, participantes originais
                const newTaskPayload = {
                    card_id: cardId,
                    tipo: 'reuniao',
                    titulo: initialData?.titulo || title, // Preserva título original
                    descricao: initialData?.descricao || description, // Preserva descrição original
                    responsavel_id: initialData?.responsavel_id || finalResponsibleId,
                    participantes_externos: initialData?.participantes_externos || externalParticipants,
                    metadata: initialData?.metadata || metadata,
                    status: 'agendada',
                    concluida: false,
                    data_vencimento: newDate,
                    rescheduled_from_id: initialData?.id || null,
                    feedback: null,
                    motivo_cancelamento: null,
                    resultado: null
                };

                const { data: newMeeting, error: createError } = await supabase
                    .from('tarefas')
                    .insert([newTaskPayload])
                    .select('id')
                    .single();

                if (createError) throw createError;
                newMeetingId = newMeeting.id;

                // 2. Update OLD meeting - ONLY status and linking, preserve ALL original data
                if (initialData?.id) {
                    const oldTaskUpdatePayload = {
                        status: 'reagendada',
                        concluida: true,
                        concluida_em: new Date().toISOString(),
                        rescheduled_to_id: newMeetingId,
                        outcome: 'remarcada' // Trigger workflow
                        // Do NOT update title, description, date, participants, etc. to preserve history
                    };

                    const { error: updateError } = await supabase
                        .from('tarefas')
                        .update(oldTaskUpdatePayload)
                        .eq('id', initialData.id);
                    error = updateError;
                }
            } else {
                // Normal Save (Create or Update)
                if (initialData?.id) {
                    const { error: updateError } = await supabase
                        .from('tarefas')
                        .update(payload)
                        .eq('id', initialData.id);
                    error = updateError;
                } else {
                    const { error: insertError } = await supabase
                        .from('tarefas')
                        .insert([payload]);
                    error = insertError;
                }
            }

            if (error) throw error;

            if (mode === 'reschedule') {
                toast.success("Re-agendamento confirmado!");
            } else {
                toast.success(initialData ? "Item atualizado!" : "Item criado!");
            }

            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] });
            queryClient.invalidateQueries({ queryKey: ['card-detail', cardId] });
            queryClient.invalidateQueries({ queryKey: ['card-tasks-completed', cardId] });

            onClose();
        } catch (error: any) {
            console.error('Error saving task:', error);
            console.error('Payload:', {
                type,
                title,
                description,
                responsibleId,
                date,
                time,
                meetingStatus,
                metadata
            });
            // Log full error object
            console.error('Full Error Object:', JSON.stringify(error, null, 2));
            toast.error(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {step === 2 && !initialData && mode !== 'reschedule' && (
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-8 w-8 p-0">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <DialogTitle>
                            {mode === 'reschedule'
                                ? 'Re-agendar Item'
                                : (step === 1 ? 'Novo Item' : (initialData ? 'Editar Item' : `Nova ${TASK_TYPES.find(t => t.id === type)?.label}`))
                            }
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {step === 1 && mode !== 'reschedule' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-4">
                        {TASK_TYPES.map((t) => {
                            const isSelected = type === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => handleTypeSelect(t.id)}
                                    role="radio"
                                    aria-checked={isSelected}
                                    className={`
                                        flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all
                                        ${isSelected ? t.activeColor : 'border-transparent hover:border-gray-200 bg-gray-50'}
                                        ${t.color.split(' ')[0]}
                                    `}
                                >
                                    <t.icon className={`w-8 h-8 ${isSelected ? 'scale-110' : ''}`} />
                                    <span className="font-medium text-sm">{t.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        {/* Common Fields */}
                        <div className="grid gap-2">
                            <Label>Título</Label>
                            <Input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder={TEMPLATES[type]}
                                required
                                className="font-medium"
                            />
                        </div>

                        {/* Date/Time - Hide if Reagendada (since we show new date picker) */}
                        {meetingStatus !== 'reagendada' && (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>Data</Label>
                                    <div
                                        className="relative cursor-pointer"
                                        onClick={() => handleWrapperClick(dateInputRef)}
                                    >
                                        <input
                                            ref={dateInputRef}
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            className="w-full h-10 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Hora</Label>
                                    <Input
                                        type="time"
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        className="font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Responsible - ONLY for Reuniao */}
                        {type === 'reuniao' && (
                            <div className="space-y-4">
                                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-purple-900 font-medium">Responsável pela Reunião</Label>
                                    <Select
                                        value={responsibleId}
                                        onChange={setResponsibleId}
                                        options={profileOptions}
                                        placeholder="Selecione quem conduzirá..."
                                    />
                                </div>
                                <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Participantes Externos (E-mails)</Label>
                                    <MultiSelectEmail
                                        value={externalParticipants}
                                        onChange={setExternalParticipants}
                                        placeholder="Digite o e-mail e pressione Enter..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Meeting Status & Logic */}
                        {type === 'reuniao' && (
                            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                                <h4 className="font-medium text-purple-900 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Status da Reunião
                                </h4>
                                <div className="grid gap-2">
                                    <Label>Situação Atual</Label>
                                    <Select
                                        value={meetingStatus}
                                        onChange={setMeetingStatus}
                                        options={[
                                            { value: 'agendada', label: 'Agendada' },
                                            { value: 'realizada', label: 'Realizada' },
                                            { value: 'cancelada', label: 'Cancelada' },
                                            { value: 'reagendada', label: 'Re-Agendada' },
                                            { value: 'nao_compareceu', label: 'Não Compareceu' }
                                        ]}
                                    />
                                </div>

                                {meetingStatus === 'realizada' && (
                                    <div className="grid gap-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid gap-2">
                                            <Label>Resumo / Ata</Label>
                                            <Input
                                                value={meetingResult}
                                                onChange={e => setMeetingResult(e.target.value)}
                                                placeholder="Resumo do que foi discutido..."
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Feedback</Label>
                                            <Textarea
                                                value={meetingFeedback}
                                                onChange={e => setMeetingFeedback(e.target.value)}
                                                placeholder="Detalhes do feedback..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {meetingStatus === 'cancelada' && (
                                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Motivo do Cancelamento</Label>
                                        <Input
                                            value={cancellationReason}
                                            onChange={e => setCancellationReason(e.target.value)}
                                            placeholder="Por que foi cancelada?"
                                        />
                                    </div>
                                )}

                                {meetingStatus === 'reagendada' && (
                                    <div className="space-y-3 p-3 bg-white rounded border border-purple-200 animate-in fade-in slide-in-from-top-2">
                                        <Label className="text-purple-700 font-medium">Nova Data e Hora</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="grid gap-2">
                                                <div
                                                    className="relative cursor-pointer"
                                                    onClick={() => handleWrapperClick(rescheduleDateInputRef)}
                                                >
                                                    <input
                                                        ref={rescheduleDateInputRef}
                                                        type="date"
                                                        value={rescheduleDate}
                                                        onChange={e => setRescheduleDate(e.target.value)}
                                                        className="w-full h-10 px-3 py-2 rounded-md border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid gap-2">
                                                <div className="relative" ref={rescheduleTimeListRef}>
                                                    <Input
                                                        value={rescheduleTime}
                                                        onChange={e => setRescheduleTime(e.target.value)}
                                                        onFocus={() => setShowRescheduleTimeList(true)}
                                                        placeholder="00:00"
                                                        className="font-medium"
                                                        maxLength={5}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-10 w-10 px-0 text-gray-400 hover:text-gray-600"
                                                        onClick={() => setShowRescheduleTimeList(!showRescheduleTimeList)}
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>

                                                    {showRescheduleTimeList && (
                                                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in-0 zoom-in-95 duration-100">
                                                            {timeOptions.map((option) => (
                                                                <div
                                                                    key={option.value}
                                                                    className={`
                                                                        relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-gray-100 hover:text-gray-900
                                                                        ${option.value === rescheduleTime ? "bg-blue-50 text-blue-900 font-medium" : ""}
                                                                    `}
                                                                    onClick={() => handleRescheduleTimeSelect(option.value)}
                                                                >
                                                                    <span className="block truncate">{option.label}</span>
                                                                    {option.value === rescheduleTime && (
                                                                        <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                                                                            <Check className="h-4 w-4 text-blue-600" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            Isso criará uma nova reunião e marcará a atual como reagendada.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Change Request Fields */}
                        {type === 'solicitacao_mudanca' && (
                            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <h4 className="font-medium text-orange-900 flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" /> Detalhes da Mudança
                                </h4>
                                <div className="grid gap-2">
                                    <Label>Categoria</Label>
                                    <Select
                                        value={metadata.change_category || ''}
                                        onChange={v => updateMetadata('change_category', v)}
                                        options={changeCategories?.map((c: any) => ({ value: c.key, label: c.label })) || []}
                                        placeholder="Selecione..."
                                    />
                                </div>

                                {metadata.change_category === 'outro' && (
                                    <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                        <Label>Qual outra categoria?</Label>
                                        <Input
                                            value={otherCategory}
                                            onChange={e => setOtherCategory(e.target.value)}
                                            placeholder="Especifique..."
                                        />
                                    </div>
                                )}

                            </div>
                        )}


                        <div className="grid gap-2">
                            <Label>Descrição / Observações</Label>
                            <Textarea
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Salvando...' : (mode === 'reschedule' ? 'Confirmar Re-agendamento' : 'Salvar Item')}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog >
    );
}
