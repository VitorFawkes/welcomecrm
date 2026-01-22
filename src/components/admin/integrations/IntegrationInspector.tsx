import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Play, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { toast } from 'sonner';

interface IntegrationInspectorProps {
    integrationId: string;
}

interface IntegrationEvent {
    id: string;
    integration_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying' | 'processed' | 'processed_shadow' | 'blocked' | 'ignored';
    created_at: string;
    payload: any;
    response: any;
    logs: any[];
    attempts: number;
    processing_log?: string;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'pending', label: 'Pendente' },
    { value: 'processing', label: 'Processando' },
    { value: 'processed', label: 'Processado' },
    { value: 'processed_shadow', label: 'Shadow' },
    { value: 'failed', label: 'Falhou' },
    { value: 'blocked', label: 'Bloqueado' },
    { value: 'ignored', label: 'Ignorado' },
];

export function IntegrationInspector({ integrationId }: IntegrationInspectorProps) {
    const queryClient = useQueryClient();
    const [selectedEvent, setSelectedEvent] = useState<IntegrationEvent | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchId, setSearchId] = useState<string>('');
    const [limit, setLimit] = useState<number>(50);

    const { data: events, isLoading, refetch } = useQuery({
        queryKey: ['integration_events', integrationId, statusFilter, searchId, limit],
        queryFn: async () => {
            let query = supabase
                .from('integration_events' as any)
                .select('*')
                .eq('integration_id', integrationId)
                .order('created_at', { ascending: false })
                .limit(limit);

            // Apply status filter
            if (statusFilter && statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Apply ID search (partial match)
            if (searchId.trim()) {
                query = query.ilike('id', `%${searchId.trim()}%`);
            }

            const { data, error } = await query;

            if (error) throw error;
            return data as unknown as IntegrationEvent[];
        },
        refetchInterval: statusFilter === 'pending' || statusFilter === 'processing' ? 5000 : false,
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
            <div className="col-span-1 border-r border-border pr-4 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Histórico de Eventos</h3>
                    <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isLoading}>
                        <RotateCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
                <div className="space-y-2 mb-4">
                    <Input
                        placeholder="Buscar por ID..."
                        value={searchId}
                        onChange={(e) => setSearchId(e.target.value)}
                        className="h-8 text-xs"
                    />
                    <Select
                        value={statusFilter}
                        onChange={setStatusFilter}
                        options={STATUS_OPTIONS}
                        placeholder="Status"
                        className="h-8 text-xs"
                    />
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant={limit === 50 ? 'default' : 'outline'}
                            className="flex-1 text-xs h-7"
                            onClick={() => setLimit(50)}
                        >
                            50
                        </Button>
                        <Button
                            size="sm"
                            variant={limit === 200 ? 'default' : 'outline'}
                            className="flex-1 text-xs h-7"
                            onClick={() => setLimit(200)}
                        >
                            200
                        </Button>
                        <Button
                            size="sm"
                            variant={limit === 500 ? 'default' : 'outline'}
                            className="flex-1 text-xs h-7"
                            onClick={() => setLimit(500)}
                        >
                            500
                        </Button>
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <div className="space-y-2">
                        {events?.map((event) => (
                            <div
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedEvent?.id === event.id
                                    ? 'bg-primary/10 border-primary/50'
                                    : 'bg-card border-border hover:bg-muted/50'
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
                                <div className="text-xs text-foreground truncate font-mono opacity-70">
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
                                <h3 className="text-lg font-bold text-foreground">Detalhes do Evento</h3>
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
                            <Card className="bg-muted/50 border-border flex flex-col">
                                <CardHeader className="py-2">
                                    <CardTitle className="text-xs uppercase text-muted-foreground">Payload (Input)</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-0">
                                    <pre className="text-xs font-mono text-emerald-600 p-4">
                                        {JSON.stringify(selectedEvent.payload, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50 border-border flex flex-col">
                                <CardHeader className="py-2">
                                    <CardTitle className="text-xs uppercase text-muted-foreground">Response / Logs</CardTitle>
                                </CardHeader>
                                <CardContent className="flex-1 overflow-auto p-0">
                                    <pre className="text-xs font-mono text-blue-600 p-4">
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
