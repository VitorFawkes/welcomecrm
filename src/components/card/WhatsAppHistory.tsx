import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
    MessageSquare,
    Check,
    CheckCheck,
    Clock,
    RefreshCw,
    AlertCircle,
    User
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Database } from '@/database.types';

type WhatsAppMessageRow = Database['public']['Tables']['whatsapp_messages']['Row'];

interface WhatsAppMessage extends Omit<WhatsAppMessageRow, 'body' | 'origem' | 'sender_name'> {
    is_from_me: boolean;
    body: string;
    sender_name?: string;
    origem?: string;
}

interface WhatsAppHistoryProps {
    contactId: string | null;
    contactPhone?: string | null;
    className?: string;
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

// Get status icon based on status
function getStatusIcon(message: WhatsAppMessage) {
    if (!message.is_from_me) return null;

    // Map status string to icon
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

export function WhatsAppHistory({ contactId, contactPhone, className }: WhatsAppHistoryProps) {
    // Normalize phone for query
    const normalizedPhone = contactPhone?.replace(/\D/g, '') || null;

    // Fetch messages
    const { data: messages, isLoading, refetch, error } = useQuery({
        queryKey: ['whatsapp-messages', contactId, normalizedPhone],
        queryFn: async () => {
            let query = supabase
                .from('whatsapp_messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(100);

            // Query by contact_id or phone (if we had sender_phone column, but we don't seem to have it in the type)
            // The table has contact_id.
            if (contactId) {
                query = query.eq('contact_id', contactId);
            } else {
                // If no contactId, we can't easily query by phone unless we join or if there was a phone column.
                // Assuming for now we only use contactId or return empty if not present.
                // If normalizedPhone is needed, we might need to find contact by phone first.
                return [];
            }

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(msg => ({
                ...msg,
                is_from_me: msg.direction === 'outbound',
                body: msg.body || '',
                // Extract metadata fields if they exist
                sender_name: (msg.metadata as any)?.sender_name,
                origem: (msg.metadata as any)?.origem,
                ack_status: (msg.metadata as any)?.ack_status
            })) as WhatsAppMessage[];
        },
        enabled: !!contactId
    });

    const groupedMessages = messages ? groupMessagesByDate(messages) : [];

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

    if (!messages?.length) {
        return (
            <div className={cn("flex flex-col items-center justify-center h-full text-muted-foreground p-8", className)}>
                <MessageSquare className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm font-medium">Nenhuma mensagem encontrada</p>
                <p className="text-xs text-center mt-1 max-w-[200px]">
                    As mensagens de WhatsApp aparecerão aqui quando forem sincronizadas.
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
                    <span className="text-sm font-medium">{messages.length} mensagens</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                    <RefreshCw className="w-3 h-3" />
                </Button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 px-4">
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
                                <div
                                    key={message.id}
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
                                        {/* Sender name (for inbound) */}
                                        {!message.is_from_me && message.sender_name && (
                                            <div className="flex items-center gap-1 text-xs font-medium text-primary">
                                                <User className="w-3 h-3" />
                                                {message.sender_name}
                                            </div>
                                        )}

                                        {/* Message body */}
                                        <p className={cn(
                                            "text-sm whitespace-pre-wrap break-words",
                                            message.is_from_me ? "text-white" : "text-foreground"
                                        )}>
                                            {message.body || <span className="italic opacity-60">[Mídia]</span>}
                                        </p>

                                        {/* Footer: Time + Status */}
                                        <div className={cn(
                                            "flex items-center gap-1 justify-end",
                                            message.is_from_me ? "text-green-100" : "text-muted-foreground"
                                        )}>
                                            {message.origem && (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "text-[9px] px-1 py-0 mr-1",
                                                        message.is_from_me
                                                            ? "border-green-200 text-green-100"
                                                            : ""
                                                    )}
                                                >
                                                    {message.origem}
                                                </Badge>
                                            )}
                                            <span className="text-[10px]">
                                                {message.created_at ? format(new Date(message.created_at), 'HH:mm') : ''}
                                            </span>
                                            {getStatusIcon(message)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
