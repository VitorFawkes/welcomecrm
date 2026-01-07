import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle, Eye, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

// --- Drawer Component ---
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

interface IntegrationEvent {
    id: string;
    integration_id: string;
    status: string;
    payload: any;
    response: any;
    logs: any;
    attempts: number;
    created_at: string;
}

interface IntegrationLogsProps {
    integrationId: string;
}

const STATUS_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
    success: { icon: CheckCircle2, label: 'Sucesso', color: 'text-green-500' },
    pending: { icon: Clock, label: 'Pendente', color: 'text-yellow-500' },
    failed: { icon: XCircle, label: 'Falhou', color: 'text-red-500' },
    retrying: { icon: RefreshCw, label: 'Tentando', color: 'text-blue-500' },
};

export function IntegrationLogs({ integrationId }: IntegrationLogsProps) {
    const [selectedEvent, setSelectedEvent] = useState<IntegrationEvent | null>(null);

    const { data: events, isLoading, refetch, isFetching } = useQuery({
        queryKey: ['integration-events', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_events' as any)
                .select('*')
                .eq('integration_id', integrationId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data as unknown as IntegrationEvent[];
        },
        enabled: !!integrationId,
    });

    // --- Metrics ---
    const totalEvents = events?.length || 0;
    const successCount = events?.filter(e => e.status === 'success').length || 0;
    const failedCount = events?.filter(e => e.status === 'failed').length || 0;
    const successRate = totalEvents > 0 ? Math.round((successCount / totalEvents) * 100) : 0;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* --- Health Overview --- */}
            <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg border">
                    <p className="text-sm text-muted-foreground">Total de Eventos</p>
                    <p className="text-2xl font-bold">{totalEvents}</p>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-200">
                    <p className="text-sm text-green-600">Taxa de Sucesso</p>
                    <p className="text-2xl font-bold text-green-600">{successRate}%</p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg border border-red-200">
                    <p className="text-sm text-red-600">Falhas</p>
                    <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                </div>
            </div>

            {/* --- Logs Table --- */}
            <div className="border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between p-3 bg-muted/50 border-b">
                    <h3 className="font-semibold text-sm">Histórico de Execuções</h3>
                    <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={cn("w-4 h-4 mr-2", isFetching && "animate-spin")} />
                        Atualizar
                    </Button>
                </div>

                {events && events.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum evento registrado ainda.</p>
                        <p className="text-xs">Eventos aparecerão aqui quando a integração for acionada.</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-muted/30 text-muted-foreground">
                            <tr>
                                <th className="text-left p-3 font-medium">Status</th>
                                <th className="text-left p-3 font-medium">Quando</th>
                                <th className="text-left p-3 font-medium">Tentativas</th>
                                <th className="text-right p-3 font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {events?.map((event) => {
                                const config = STATUS_CONFIG[event.status] || STATUS_CONFIG.pending;
                                const Icon = config.icon;
                                return (
                                    <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="p-3">
                                            <Badge variant="outline" className={cn("gap-1", config.color)}>
                                                <Icon className="w-3 h-3" />
                                                {config.label}
                                            </Badge>
                                        </td>
                                        <td className="p-3 text-muted-foreground">
                                            {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ptBR })}
                                        </td>
                                        <td className="p-3">
                                            {event.attempts > 1 ? (
                                                <span className="text-yellow-600 font-medium">{event.attempts}x</span>
                                            ) : (
                                                <span className="text-muted-foreground">1</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(event)}>
                                                <Eye className="w-4 h-4 mr-1" />
                                                Detalhes
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* --- Detail Drawer --- */}
            <Sheet open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                            {selectedEvent && STATUS_CONFIG[selectedEvent.status] && (
                                <>
                                    {(() => {
                                        const Icon = STATUS_CONFIG[selectedEvent.status].icon;
                                        return <Icon className={cn("w-5 h-5", STATUS_CONFIG[selectedEvent.status].color)} />;
                                    })()}
                                </>
                            )}
                            Detalhes do Evento
                        </SheetTitle>
                        <SheetDescription>
                            ID: {selectedEvent?.id.slice(0, 8)}...
                        </SheetDescription>
                    </SheetHeader>

                    {selectedEvent && (
                        <div className="mt-6 space-y-6">
                            {/* --- Request (Payload) --- */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Dados Enviados / Recebidos (Payload)</h4>
                                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-60 border">
                                    {JSON.stringify(selectedEvent.payload, null, 2) || 'N/A'}
                                </pre>
                            </div>

                            {/* --- Response --- */}
                            <div>
                                <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Resposta do Servidor</h4>
                                <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-60 border">
                                    {JSON.stringify(selectedEvent.response, null, 2) || 'Nenhuma resposta recebida.'}
                                </pre>
                            </div>

                            {/* --- Internal Logs --- */}
                            {selectedEvent.logs && (
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">Logs Internos</h4>
                                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-40 border">
                                        {JSON.stringify(selectedEvent.logs, null, 2)}
                                    </pre>
                                </div>
                            )}

                            {/* --- Actions --- */}
                            <div className="flex gap-2 pt-4 border-t">
                                <Button variant="outline" className="flex-1" disabled>
                                    <RotateCcw className="w-4 h-4 mr-2" />
                                    Reprocessar (Em breve)
                                </Button>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
