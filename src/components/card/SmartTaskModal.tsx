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

interface SmartTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    cardId: string;
    initialData?: any; // For edit mode
}

type TaskType = 'tarefa' | 'ligacao' | 'whatsapp' | 'email' | 'reuniao' | 'solicitacao_mudanca' | 'enviar_proposta';

const TASK_TYPES: { id: TaskType; label: string; icon: any; color: string; activeColor: string }[] = [
    { id: 'tarefa', label: 'Tarefa', icon: CheckCircle2, color: 'text-indigo-600 bg-indigo-50 border-indigo-200', activeColor: 'ring-2 ring-indigo-500 bg-indigo-100' },
    { id: 'ligacao', label: 'Ligação', icon: Phone, color: 'text-cyan-600 bg-cyan-50 border-cyan-200', activeColor: 'ring-2 ring-cyan-500 bg-cyan-100' },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'text-green-600 bg-green-50 border-green-200', activeColor: 'ring-2 ring-green-500 bg-green-100' },
    { id: 'email', label: 'E-mail', icon: Mail, color: 'text-blue-600 bg-blue-50 border-blue-200', activeColor: 'ring-2 ring-blue-500 bg-blue-100' },
    { id: 'reuniao', label: 'Reunião', icon: Users, color: 'text-purple-600 bg-purple-50 border-purple-200', activeColor: 'ring-2 ring-purple-500 bg-purple-100' },
    { id: 'solicitacao_mudanca', label: 'Mudança', icon: RefreshCw, color: 'text-orange-600 bg-orange-50 border-orange-200', activeColor: 'ring-2 ring-orange-500 bg-orange-100' },
    { id: 'enviar_proposta', label: 'Proposta', icon: FileCheck, color: 'text-emerald-600 bg-emerald-50 border-emerald-200', activeColor: 'ring-2 ring-emerald-500 bg-emerald-100' },
];

const TEMPLATES: Record<TaskType, string> = {
    tarefa: "Ex: Enviar briefing por e-mail...",
    ligacao: "Ex: Ligar para confirmar detalhes...",
    whatsapp: "Ex: WhatsApp para follow-up...",
    email: "Ex: E-mail com proposta...",
    reuniao: "Ex: Reunião de alinhamento...",
    solicitacao_mudanca: "Ex: Mudança de destino / hotel...",
    enviar_proposta: "Ex: Enviar proposta..."
};

export function SmartTaskModal({ isOpen, onClose, cardId, initialData }: SmartTaskModalProps) {
    // Step 1: Type Selection, Step 2: Form
    const [step, setStep] = useState<1 | 2>(1);

    // Common Fields
    const [type, setType] = useState<TaskType>('tarefa');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [responsibleId, setResponsibleId] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');

    // Refs for native pickers
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Time Combobox State
    const [showTimeList, setShowTimeList] = useState(false);
    const timeListRef = useRef<HTMLDivElement>(null);

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
            if (initialData) {
                // Edit mode
                setStep(2);
                setTitle(initialData.titulo || '');
                setDescription(initialData.descricao || '');
                setType((initialData.tipo as TaskType) || 'tarefa');
                setResponsibleId(initialData.responsavel_id || '');
                setMetadata(initialData.metadata || {});

                if (initialData.data_vencimento) {
                    const dt = new Date(initialData.data_vencimento);
                    // Use local time components to avoid timezone shifts
                    setDate(formatLocalDate(dt));

                    // Round existing time to nearest 15 min for the select
                    const minutes = dt.getMinutes();
                    const roundedMinutes = Math.round(minutes / 15) * 15;
                    dt.setMinutes(roundedMinutes);
                    setTime(formatLocalTime(dt));
                } else {
                    setDate('');
                    setTime('');
                }
            } else {
                // Create mode - Reset everything
                setStep(1);
                setTitle('');
                setDescription('');
                setType('tarefa');
                setMetadata({});
                setResponsibleId('');

                // Defaults: Today + Now (rounded to next 15 min)
                const now = new Date();
                const minutes = now.getMinutes();
                const roundedMinutes = Math.ceil(minutes / 15) * 15;
                now.setMinutes(roundedMinutes);

                setDate(formatLocalDate(now));
                setTime(formatLocalTime(now));
            }
        }
    }, [isOpen, initialData]);

    // Close time list when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (timeListRef.current && !timeListRef.current.contains(event.target as Node)) {
                setShowTimeList(false);
            }
        };

        if (showTimeList) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showTimeList]);

    const handleTypeSelect = (selectedType: TaskType) => {
        // Reset metadata when switching types to avoid stale state
        setMetadata({});

        // Update type
        setType(selectedType);
        setStep(2);

        // Reset title if it's empty or matches a known template (meaning user hasn't customized it)
        if (!initialData) {
            setTitle('');
        }
    };

    const updateMetadata = (key: string, value: any) => {
        setMetadata((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleWrapperClick = (ref: React.RefObject<HTMLInputElement | null>) => {
        if (ref.current) {
            ref.current.focus();
        }
    };

    const handleTimeSelect = (timeValue: string) => {
        setTime(timeValue);
        setShowTimeList(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // Combine date and time
            let finalDate = null;
            if (date && time) {
                // Create date in local time then convert to ISO
                finalDate = new Date(`${date}T${time}:00`).toISOString();
            } else if (date) {
                finalDate = new Date(`${date}T09:00:00`).toISOString(); // Default to 9am
            }

            // Get current user
            const { data: { user } } = await supabase.auth.getUser();

            // Determine responsible
            let finalResponsibleId = responsibleId;

            // If it's NOT a meeting, we don't show the selector, so we default to current user
            // If it IS a meeting, the user MUST select someone (or we use what was selected)
            if (type !== 'reuniao') {
                finalResponsibleId = user?.id || '';
            }

            // Validation: Meeting requires explicit responsible
            if (type === 'reuniao' && !finalResponsibleId) {
                throw new Error("Para reuniões, é obrigatório selecionar um responsável.");
            }

            // Fallback for other types if something went wrong (shouldn't happen with user?.id)
            if (!finalResponsibleId) {
                // If we still don't have an ID (e.g. auth error), try to use initialData or just fail
                finalResponsibleId = initialData?.responsavel_id || user?.id;
                if (!finalResponsibleId) throw new Error("Não foi possível identificar o responsável.");
            }

            // Prepare payload
            const payload = {
                card_id: cardId,
                titulo: title,
                descricao: description,
                tipo: type,
                data_vencimento: finalDate,
                responsavel_id: finalResponsibleId,
                status: 'pendente',
                concluida: false,
                metadata: metadata
            };

            let error;
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

            if (error) throw error;

            toast.success(initialData ? "Item atualizado!" : "Item criado!");

            queryClient.invalidateQueries({ queryKey: ['tasks', cardId] });
            queryClient.invalidateQueries({ queryKey: ['card-detail', cardId] });

            onClose();
        } catch (error: any) {
            console.error('Error:', error);
            toast.error(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        {step === 2 && !initialData && (
                            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="h-8 w-8 p-0">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <DialogTitle>
                            {step === 1 ? 'Novo Item' : (initialData ? 'Editar Item' : `Nova ${TASK_TYPES.find(t => t.id === type)?.label}`)}
                        </DialogTitle>
                    </div>
                </DialogHeader>

                {step === 1 ? (
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
                                <div className="relative" ref={timeListRef}>
                                    <Input
                                        value={time}
                                        onChange={e => setTime(e.target.value)}
                                        onFocus={() => setShowTimeList(true)}
                                        placeholder="00:00"
                                        className="font-medium"
                                        maxLength={5}
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="absolute right-0 top-0 h-10 w-10 px-0 text-gray-400 hover:text-gray-600"
                                        onClick={() => setShowTimeList(!showTimeList)}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </Button>

                                    {showTimeList && (
                                        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in-0 zoom-in-95 duration-100">
                                            {timeOptions.map((option) => (
                                                <div
                                                    key={option.value}
                                                    className={`
                                                        relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none transition-colors hover:bg-gray-100 hover:text-gray-900
                                                        ${option.value === time ? "bg-blue-50 text-blue-900 font-medium" : ""}
                                                    `}
                                                    onClick={() => handleTimeSelect(option.value)}
                                                >
                                                    <span className="block truncate">{option.label}</span>
                                                    {option.value === time && (
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

                        {/* Responsible - ONLY for Reuniao */}
                        {type === 'reuniao' && (
                            <div className="grid gap-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="text-purple-900 font-medium">Responsável pela Reunião</Label>
                                <Select
                                    value={responsibleId}
                                    onChange={setResponsibleId}
                                    options={profileOptions}
                                    placeholder="Selecione quem conduzirá..."
                                />
                            </div>
                        )}

                        {/* Type Specific Fields (Metadata) */}
                        {type === 'reuniao' && (
                            <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-100">
                                <h4 className="font-medium text-purple-900 flex items-center gap-2">
                                    <Users className="h-4 w-4" /> Detalhes da Reunião
                                </h4>
                                <div className="grid gap-2">
                                    <Label>Local / Link</Label>
                                    <Input
                                        value={metadata.location || ''}
                                        onChange={e => updateMetadata('location', e.target.value)}
                                        placeholder="Ex: Google Meet, Sala 1..."
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Participantes Externos (Emails)</Label>
                                    <Input
                                        value={metadata.participants_external || ''}
                                        onChange={e => updateMetadata('participants_external', e.target.value)}
                                        placeholder="email@cliente.com, ..."
                                    />
                                </div>
                            </div>
                        )}

                        {type === 'solicitacao_mudanca' && (
                            <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
                                <h4 className="font-medium text-orange-900 flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4" /> Detalhes da Mudança
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>Categoria</Label>
                                        <Select
                                            value={metadata.change_category || ''}
                                            onChange={v => updateMetadata('change_category', v)}
                                            options={[
                                                { value: 'voo', label: 'Voo' },
                                                { value: 'hotel', label: 'Hotel' },
                                                { value: 'datas', label: 'Datas' },
                                                { value: 'financeiro', label: 'Financeiro' },
                                                { value: 'outro', label: 'Outro' }
                                            ]}
                                            placeholder="Selecione..."
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Impacto</Label>
                                        <Select
                                            value={metadata.impact || ''}
                                            onChange={v => updateMetadata('impact', v)}
                                            options={[
                                                { value: 'baixo', label: 'Baixo' },
                                                { value: 'medio', label: 'Médio' },
                                                { value: 'alto', label: 'Alto' }
                                            ]}
                                            placeholder="Selecione..."
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>O que mudou?</Label>
                                    <Textarea
                                        value={metadata.what_changed || ''}
                                        onChange={e => updateMetadata('what_changed', e.target.value)}
                                        placeholder="Descreva a mudança solicitada..."
                                        className="bg-white"
                                    />
                                </div>
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
                                {isSubmitting ? 'Salvando...' : 'Salvar Item'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
