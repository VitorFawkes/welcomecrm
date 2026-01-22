import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    MessageSquare,
    Check,
    CheckCheck,
    Clock,
    RefreshCw,
    AlertCircle,
    User,
    Play,
    FileText,
    Image as ImageIcon,
    Video,
    ExternalLink,
    Mic
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WhatsAppMessage {
    id: string;
    contact_id: string;
    card_id: string | null;
    body: string | null;
    direction: string;
    is_from_me: boolean;
    sender_name: string | null;
    message_type: string | null;
    media_url: string | null;
    status: string | null;
    created_at: string | null;
    sent_by_user_name: string | null;
}

interface WhatsAppHistoryProps {
    contactId: string | null;
    contactPhone?: string | null;
    className?: string;
}

// Parse buttons from text like "---BUTTONS---\n[URL:https://...]Label"
function parseMessageContent(text: string | null): { body: string; buttons: { type: string; url: string; label: string }[] } {
    if (!text) return { body: '', buttons: [] };

    const buttonSeparator = '---BUTTONS---';
    const parts = text.split(buttonSeparator);

    if (parts.length === 1) {
        return { body: text, buttons: [] };
    }

    const body = parts[0].trim();
    const buttonSection = parts[1] || '';
    const buttons: { type: string; url: string; label: string }[] = [];

    // Parse [URL:https://example.com]Label format
    const buttonRegex = /\[URL:(.*?)\](.*?)(?=\[URL:|$)/g;
    let match;
    while ((match = buttonRegex.exec(buttonSection)) !== null) {
        buttons.push({
            type: 'url',
            url: match[1].trim(),
            label: match[2].trim()
        });
    }

    return { body, buttons };
}

// Group messages by date
function groupMessagesByDate(messages: WhatsAppMessage[]) {
    const groups: { date: string; label: string; messages: WhatsAppMessage[] }[] = [];

    for (const message of messages) {
        if (!message.created_at) continue;
        const date = new Date(message.created_at);
        const dateKey = format(date, 'yyyy-MM-dd');

        let label: string;
        if (isToday(date)) {
            label = 'Hoje';
        } else if (isYesterday(date)) {
            label = 'Ontem';
        } else {
            label = format(date, "dd 'de' MMMM", { locale: ptBR });
        }

        const existingGroup = groups.find(g => g.date === dateKey);
        if (existingGroup) {
            existingGroup.messages.push(message);
        } else {
            groups.push({ date: dateKey, label, messages: [message] });
        }
    }

    return groups;
}

// Get status icon
function getStatusIcon(message: WhatsAppMessage) {
    if (!message.is_from_me) return null;

    if (message.status === 'read') {
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
    }
    if (message.status === 'delivered') {
        return <CheckCheck className="w-3 h-3 text-muted-foreground" />;
    }
    if (message.status === 'sent') {
        return <Check className="w-3 h-3 text-muted-foreground" />;
    }
    return <Clock className="w-3 h-3 text-muted-foreground" />;
}

// Render media content
function MessageMedia({ message }: { message: WhatsAppMessage }) {
    const { media_url, message_type, body } = message;

    if (!media_url) return null;

    const isImage = message_type === 'image' || media_url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    const isAudio = message_type === 'audio' || media_url.match(/\.(ogg|mp3|wav|m4a)$/i);
    const isVideo = message_type === 'video' || media_url.match(/\.(mp4|webm|mov)$/i);
    const isDocument = message_type === 'document' || media_url.match(/\.(pdf|doc|docx|xls|xlsx)$/i);

    if (isImage) {
        return (
            <div className="rounded-lg overflow-hidden max-w-[250px] mb-2">
                <img
                    src={media_url}
                    alt="Imagem"
                    className="w-full h-auto object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(media_url, '_blank')}
                />
            </div>
        );
    }

    if (isAudio) {
        return (
            <div className="flex items-center gap-2 bg-black/10 rounded-full px-3 py-2 mb-2">
                <button
                    onClick={() => {
                        const audio = new Audio(media_url);
                        audio.play();
                    }}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                    <Play className="w-4 h-4 fill-current" />
                </button>
                <div className="flex-1 h-1 bg-white/30 rounded-full">
                    <div className="w-1/3 h-full bg-white/60 rounded-full" />
                </div>
                <Mic className="w-4 h-4 opacity-60" />
            </div>
        );
    }

    if (isVideo) {
        return (
            <div className="rounded-lg overflow-hidden max-w-[280px] mb-2">
                <video
                    src={media_url}
                    controls
                    className="w-full h-auto"
                    preload="metadata"
                />
            </div>
        );
    }

    if (isDocument) {
        const fileName = media_url.split('/').pop() || 'Documento';
        return (
            <a
                href={media_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2 mb-2 hover:bg-black/20 transition-colors"
            >
                <FileText className="w-5 h-5" />
                <span className="text-sm truncate max-w-[180px]">{fileName}</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
            </a>
        );
    }

    // Generic media link
    return (
        <a
            href={media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm underline opacity-80 hover:opacity-100"
        >
            <ImageIcon className="w-4 h-4" />
            Ver mídia
        </a>
    );
}

// Message bubble component
function MessageBubble({ message }: { message: WhatsAppMessage }) {
    const { body, buttons } = parseMessageContent(message.body);
    const hasContent = body || message.media_url;

    if (!hasContent && !buttons.length) {
        return null; // Don't render empty messages
    }

    return (
        <div
            className={cn(
                "flex",
                message.is_from_me ? "justify-end" : "justify-start"
            )}
        >
            <div
                className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2 space-y-1",
                    message.is_from_me
                        ? "bg-green-500 text-white rounded-br-sm"
                        : "bg-muted rounded-bl-sm"
                )}
            >
                {/* Sender name (for inbound or agent name for outbound) */}
                {message.is_from_me && message.sent_by_user_name && (
                    <div className="flex items-center gap-1 text-xs font-medium text-green-100">
                        <User className="w-3 h-3" />
                        {message.sent_by_user_name}
                    </div>
                )}
                {!message.is_from_me && message.sender_name && (
                    <div className="flex items-center gap-1 text-xs font-medium text-primary">
                        <User className="w-3 h-3" />
                        {message.sender_name}
                    </div>
                )}

                {/* Media content */}
                <MessageMedia message={message} />

                {/* Message body */}
                {body && (
                    <p className={cn(
                        "text-sm whitespace-pre-wrap break-words",
                        message.is_from_me ? "text-white" : "text-foreground"
                    )}>
                        {body}
                    </p>
                )}

                {/* Buttons */}
                {buttons.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {buttons.map((btn, idx) => (
                            <a
                                key={idx}
                                href={btn.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                                    message.is_from_me
                                        ? "bg-white/20 text-white hover:bg-white/30"
                                        : "bg-primary/10 text-primary hover:bg-primary/20"
                                )}
                            >
                                <ExternalLink className="w-3 h-3" />
                                {btn.label}
                            </a>
                        ))}
                    </div>
                )}

                {/* Footer: Time + Status */}
                <div className={cn(
                    "flex items-center gap-1 justify-end text-[10px]",
                    message.is_from_me ? "text-green-100" : "text-muted-foreground"
                )}>
                    {message.message_type && message.message_type !== 'text' && (
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[9px] px-1 py-0 mr-1",
                                message.is_from_me ? "border-green-200 text-green-100" : ""
                            )}
                        >
                            {message.message_type}
                        </Badge>
                    )}
                    <span>
                        {message.created_at ? format(new Date(message.created_at), 'HH:mm') : ''}
                    </span>
                    {getStatusIcon(message)}
                </div>
            </div>
        </div>
    );
}

export function WhatsAppHistory({ contactId, className }: WhatsAppHistoryProps) {
    const queryClient = useQueryClient();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch messages
    const { data: messages, isLoading, refetch, error } = useQuery({
        queryKey: ['whatsapp-messages', contactId],
        queryFn: async () => {
            if (!contactId) return [];

            const { data, error } = await supabase
                .from('whatsapp_messages')
                .select('id, contact_id, card_id, body, direction, is_from_me, sender_name, message_type, media_url, status, created_at, sent_by_user_name')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: true })
                .limit(200);

            if (error) throw error;
            return data as WhatsAppMessage[];
        },
        enabled: !!contactId
    });

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = useCallback(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Supabase Realtime subscription for new messages
    useEffect(() => {
        if (!contactId) return;

        const channel = supabase
            .channel(`whatsapp-messages-${contactId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'whatsapp_messages',
                    filter: `contact_id=eq.${contactId}`
                },
                (payload) => {
                    // Invalidate query to refetch with new message
                    queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', contactId] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [contactId, queryClient]);

    const groupedMessages = messages ? groupMessagesByDate(messages) : [];

    // Filter out messages with no content
    const hasMessages = messages && messages.some(m => m.body || m.media_url);

    if (!contactId) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full text-muted-foreground p-8", className)}>
                <AlertCircle className="w-8 h-8 mb-3" />
                <p className="text-sm text-center">
                    Nenhum contato selecionado
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className={cn("flex items-center justify-center h-full", className)}>
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full text-red-500 p-8", className)}>
                <AlertCircle className="w-8 h-8 mb-3" />
                <p className="text-sm">Erro ao carregar mensagens</p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
                    Tentar novamente
                </Button>
            </div>
        );
    }

    if (!hasMessages) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full text-muted-foreground p-8", className)}>
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
                <p className="text-xs text-center mt-1 max-w-[200px]">
                    As mensagens de WhatsApp aparecerão aqui automaticamente.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    Atualizar
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("flex flex-col h-full", className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">{messages?.filter(m => m.body || m.media_url).length || 0} mensagens</span>
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Atualizando em tempo real" />
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-3 h-3" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4" ref={scrollRef}>
                <div className="py-4 space-y-4">
                    {groupedMessages.map((group) => (
                        <div key={group.date} className="space-y-2">
                            {/* Date separator */}
                            <div className="flex items-center justify-center">
                                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                                    {group.label}
                                </span>
                            </div>

                            {/* Messages in group */}
                            {group.messages.map((message) => (
                                <MessageBubble key={message.id} message={message} />
                            ))}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
