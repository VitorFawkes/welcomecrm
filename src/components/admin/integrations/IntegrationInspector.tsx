import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface IntegrationInspectorProps {
    integrationId: string;
}

interface IntegrationEvent {
    id: string;
    integration_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
    created_at: string;
    payload: any;
    response: any;
    logs: any[];
    attempts: number;
}

export function IntegrationInspector({ integrationId }: IntegrationInspectorProps) {
    const queryClient = useQueryClient();
    const [selectedEvent, setSelectedEvent] = useState<IntegrationEvent | null>(null);

    const { data: events } = useQuery({
        queryKey: ['integration_events', integrationId],
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
        refetchInterval: 5000, // Live updates
    });

    const replayMutation = useMutation({
        mutationFn: async (eventId: string) => {
            const { error } = await supabase
                .from('integration_events' as any)
                .update({ status: 'pending', attempts: 0, next_retry_at: null, logs: [] }) // Reset for retry
                .eq('id', eventId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integration_events'] });
            toast.success('Evento reenfileirado para processamento.');
        },
        onError: (error) => {
            toast.error(`Erro ao reenfileirar: ${error.message}`);
        },
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'processing': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'retrying': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            default: return <Clock className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="grid grid-cols-3 gap-6 h-[600px]">
            <div className="col-span-1 border-r border-white/10 pr-4 flex flex-col h-full">
                <h3 className="text-sm font-medium text-muted-foreground mb-4">Histórico de Eventos</h3>
                <ScrollArea className="flex-1">
                    <div className="space-y-2">
                        {events?.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedEvent?.id === event.id
                                    ? 'bg-primary/10 border-primary/50'
                                    : 'bg-card/30 border-white/5 hover:bg-card/50'
                                    }`}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex items-center space-x-2">
                                        {getStatusIcon(event.status)}
                                        <span className="text-xs font-mono text-muted-foreground">
                                            {new Date(event.created_at).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] h-5">
                                        {event.status}
                                    </Badge>
                                </div>
                                <div className="text-xs text-white truncate font-mono opacity-70">
                                    ID: {event.id.slice(0, 8)}...
                                </div>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            <div className="col-span-2 flex flex-col h-full">
                {selectedEvent ? (
                    <div className="space-y-6 h-full flex flex-col">
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-bold text-white">Detalhes do Evento</h3>
                                <p className="text-xs text-muted-foreground font-mono">{selectedEvent.id}</p>
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => replayMutation.mutate(selectedEvent.id)}
                                    disabled={selectedEvent.status === 'pending' || selectedEvent.status === 'processing'}
                                >
                                    <Play className="w-3 h-3 mr-2" />
                                    Replay
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden">
                            <Card className="bg-black/20 border-white/10 flex flex-col">
                                <CardHeader className="py-2">
                                    <CardTitle className="text-xs uppercase text-muted-foreground">Payload (Input)</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-0">
                                    <pre className="text-xs font-mono text-emerald-400 p-4">
                                        {JSON.stringify(selectedEvent.payload, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>

                            <Card className="bg-black/20 border-white/10 flex flex-col">
                                <CardHeader className="py-2">
                                    <CardTitle className="text-xs uppercase text-muted-foreground">Response / Logs</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-0">
                                    <pre className="text-xs font-mono text-blue-400 p-4">
                                        {JSON.stringify(selectedEvent.response || selectedEvent.logs, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                        Selecione um evento para ver os detalhes
                    </div>
                )}
            </div>
        </div>
    );
}
