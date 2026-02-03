import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import {
    RefreshCw,
    Clock,
    ArrowUpRight,
    CheckCircle,
    XCircle,
    Eye,
    Play,
    Loader2,
    AlertTriangle,
    Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OutboundEvent {
    id: string;
    card_id: string;
    integration_id: string;
    external_id: string;
    event_type: string;
    payload: Record<string, unknown>;
    status: 'pending' | 'processing' | 'sent' | 'failed' | 'blocked' | 'shadow';
    processing_log: string | null;
    attempts: number;
    max_attempts: number;
    triggered_by: string;
    created_at: string;
    processed_at: string | null;
    cards?: {
        titulo: string;
        pessoa_principal?: {
            nome: string;
        };
    };
}

interface OutboundLogsTabProps {
    integrationId: string;
}

const STATUS_CONFIG = {
    pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
    processing: { label: 'Processando', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
    sent: { label: 'Enviado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
    failed: { label: 'Falhou', color: 'bg-red-100 text-red-700', icon: XCircle },
    blocked: { label: 'Bloqueado', color: 'bg-gray-100 text-gray-700', icon: AlertTriangle },
    shadow: { label: 'Shadow', color: 'bg-purple-100 text-purple-700', icon: Eye }
};

const EVENT_TYPE_LABELS: Record<string, string> = {
    stage_change: 'Mudança de Etapa',
    won: 'Ganho',
    lost: 'Perdido',
    field_update: 'Atualização de Campo'
};

export function OutboundLogsTab({ integrationId }: OutboundLogsTabProps) {
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [eventTypeFilter, setEventTypeFilter] = useState<string>('all');

    // Fetch outbound events
    const { data: events, isLoading, refetch } = useQuery({
        queryKey: ['outbound-events', integrationId, statusFilter, eventTypeFilter],
        queryFn: async () => {
            let query = supabase
                .from('integration_outbound_queue')
                .select(`
                    *,
                    cards:card_id(titulo, pessoa_principal:pessoa_principal_id(nome))
                `)
                .eq('integration_id', integrationId)
                .order('created_at', { ascending: false })
                .limit(100);

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }
            if (eventTypeFilter !== 'all') {
                query = query.eq('event_type', eventTypeFilter);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as unknown as OutboundEvent[];
        }
    });

    // Process pending events
    const dispatchMutation = useMutation({
        mutationFn: async () => {
            const { data, error } = await supabase.functions.invoke('integration-dispatch');
            if (error) throw error;
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['outbound-events'] });
            const sent = data?.sent || 0;
            const failed = data?.failed || 0;
            if (sent === 0 && failed === 0) {
                toast.info('Nenhum evento pendente para processar');
            } else {
                toast.success(`Processado: ${sent} enviados, ${failed} falhas`);
            }
        },
        onError: (err: Error) => {
            toast.error('Erro ao processar: ' + err.message);
        }
    });

    // Clear shadow events
    const clearShadowMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('integration_outbound_queue')
                .delete()
                .eq('integration_id', integrationId)
                .eq('status', 'shadow');
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outbound-events'] });
            toast.success('Eventos shadow removidos');
        },
        onError: (err: Error) => {
            toast.error('Erro ao limpar: ' + err.message);
        }
    });

    // Stats
    const stats = {
        pending: events?.filter(e => e.status === 'pending').length || 0,
        shadow: events?.filter(e => e.status === 'shadow').length || 0,
        sent: events?.filter(e => e.status === 'sent').length || 0,
        failed: events?.filter(e => e.status === 'failed').length || 0
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                                Fila de Sincronização (Outbound)
                            </CardTitle>
                            <CardDescription>
                                Eventos de mudança no CRM aguardando envio para o ActiveCampaign.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                            >
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Atualizar
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => dispatchMutation.mutate()}
                                disabled={dispatchMutation.isPending || stats.pending === 0}
                            >
                                {dispatchMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 mr-1" />
                                )}
                                Processar Pendentes ({stats.pending})
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{stats.pending}</div>
                    <div className="text-xs text-yellow-600">Pendentes</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-700">{stats.shadow}</div>
                    <div className="text-xs text-purple-600">Shadow (Teste)</div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats.sent}</div>
                    <div className="text-xs text-green-600">Enviados</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
                    <div className="text-xs text-red-600">Falhas</div>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Status:</span>
                            <Select
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { value: 'all', label: 'Todos' },
                                    { value: 'pending', label: 'Pendentes' },
                                    { value: 'shadow', label: 'Shadow' },
                                    { value: 'sent', label: 'Enviados' },
                                    { value: 'failed', label: 'Falhas' },
                                    { value: 'blocked', label: 'Bloqueados' }
                                ]}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Tipo:</span>
                            <Select
                                value={eventTypeFilter}
                                onChange={setEventTypeFilter}
                                options={[
                                    { value: 'all', label: 'Todos' },
                                    { value: 'stage_change', label: 'Mudança de Etapa' },
                                    { value: 'won', label: 'Ganho' },
                                    { value: 'lost', label: 'Perdido' },
                                    { value: 'field_update', label: 'Campo' }
                                ]}
                            />
                        </div>
                        {stats.shadow > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="ml-auto text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                onClick={() => {
                                    if (confirm('Remover todos os eventos em Shadow Mode?')) {
                                        clearShadowMutation.mutate();
                                    }
                                }}
                                disabled={clearShadowMutation.isPending}
                            >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Limpar Shadow ({stats.shadow})
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Events List */}
            <Card>
                <CardContent className="py-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : !events?.length ? (
                        <div className="text-center py-8 text-muted-foreground">
                            Nenhum evento encontrado
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {events.map(event => {
                                const statusConfig = STATUS_CONFIG[event.status];
                                const StatusIcon = statusConfig.icon;
                                const eventTime = new Date(event.created_at).toLocaleString('pt-BR');
                                const cardTitle = event.cards?.titulo || 'Card não encontrado';
                                const contactName = event.cards?.pessoa_principal?.nome || '';

                                return (
                                    <div
                                        key={event.id}
                                        className={cn(
                                            "p-4 rounded-lg border transition-colors",
                                            event.status === 'failed' && "bg-red-50/50 border-red-200",
                                            event.status === 'shadow' && "bg-purple-50/50 border-purple-200",
                                            event.status === 'sent' && "bg-green-50/50 border-green-200",
                                            event.status === 'pending' && "bg-yellow-50/50 border-yellow-200"
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                                    <Badge className={cn("text-xs", statusConfig.color)}>
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {statusConfig.label}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {EVENT_TYPE_LABELS[event.event_type] || event.event_type}
                                                    </Badge>
                                                    {event.attempts > 0 && (
                                                        <Badge variant="outline" className="text-xs">
                                                            Tentativa {event.attempts}/{event.max_attempts}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <p className="font-medium text-sm truncate">
                                                    {cardTitle}
                                                    {contactName && (
                                                        <span className="text-muted-foreground font-normal">
                                                            {' '}• {contactName}
                                                        </span>
                                                    )}
                                                </p>

                                                <p className="text-xs text-muted-foreground mt-1">
                                                    AC Deal ID: {event.external_id}
                                                </p>

                                                {/* Payload Preview */}
                                                {event.payload && (
                                                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs font-mono overflow-x-auto">
                                                        {event.event_type === 'stage_change' && (
                                                            <span>
                                                                → Stage: {(event.payload as { target_external_stage_name?: string }).target_external_stage_name || (event.payload as { target_external_stage_id?: string }).target_external_stage_id}
                                                            </span>
                                                        )}
                                                        {event.event_type === 'field_update' && (
                                                            <span>
                                                                {Object.entries(event.payload)
                                                                    .filter(([k]) => k !== 'shadow_mode')
                                                                    .map(([k, v]) => `${k}: ${v}`)
                                                                    .join(', ')}
                                                            </span>
                                                        )}
                                                        {(event.event_type === 'won' || event.event_type === 'lost') && (
                                                            <span>
                                                                Status: {(event.payload as { status?: string }).status}
                                                                {(event.payload as { valor_final?: number }).valor_final && ` • Valor: R$ ${(event.payload as { valor_final?: number }).valor_final?.toLocaleString('pt-BR')}`}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Error Log */}
                                                {event.processing_log && event.status === 'failed' && (
                                                    <div className="mt-2 p-2 bg-red-100 rounded text-xs text-red-700">
                                                        {event.processing_log}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                                <Clock className="w-3 h-3" />
                                                {eventTime}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-blue-50/50 border-blue-200">
                <CardContent className="py-4">
                    <h4 className="font-medium text-sm text-blue-700 mb-2">
                        Como funciona
                    </h4>
                    <ul className="text-xs text-blue-600/80 space-y-1">
                        <li><strong>Pendente:</strong> Evento aguardando processamento pelo dispatch</li>
                        <li><strong>Shadow:</strong> Evento registrado em modo teste (não será enviado para AC)</li>
                        <li><strong>Enviado:</strong> Evento processado e enviado com sucesso para AC</li>
                        <li><strong>Falhou:</strong> Erro ao enviar para AC (será retentado automaticamente)</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
