import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SyncGovernancePanel } from './SyncGovernancePanel';
import { IntegrationLogs } from './IntegrationLogs';
import {
    AlertTriangle,
    Clock,
    XCircle,
    ArrowDownLeft,
    ArrowUpRight,
    RefreshCw,
    Loader2,
    Activity,
    TrendingUp,
    Calendar,
    Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useState } from 'react';

interface IntegrationOverviewTabProps {
    integrationId: string;
}

interface OverviewStats {
    inbound: {
        total: number;
        pending: number;
        processed: number;
        failed: number;
        ignored: number;
        today: number;
        thisWeek: number;
    };
    outbound: {
        total: number;
        pending: number;
        sent: number;
        failed: number;
        today: number;
    };
    rules: {
        inboundActive: number;
        outboundActive: number;
    };
    lastActivity: string | null;
}

export function IntegrationOverviewTab({ integrationId }: IntegrationOverviewTabProps) {
    const [processing, setProcessing] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // Fetch comprehensive stats
    const { data: stats, isLoading, refetch } = useQuery({
        queryKey: ['integration-overview', integrationId],
        queryFn: async (): Promise<OverviewStats> => {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const [
                inboundEventsRes,
                inboundTodayRes,
                inboundWeekRes,
                outboundQueueRes,
                outboundTodayRes,
                inboundRulesRes,
                outboundRulesRes
            ] = await Promise.all([
                supabase.from('integration_events').select('status').eq('integration_id', integrationId),
                supabase.from('integration_events').select('id').eq('integration_id', integrationId).gte('created_at', todayStart),
                supabase.from('integration_events').select('id').eq('integration_id', integrationId).gte('created_at', weekStart),
                supabase.from('integration_outbound_queue').select('status'),
                supabase.from('integration_outbound_queue').select('id').gte('created_at', todayStart),
                supabase.from('integration_inbound_triggers').select('id, is_active').eq('integration_id', integrationId),
                supabase.from('integration_outbound_triggers').select('id, is_active').eq('integration_id', integrationId)
            ]);

            // Get last event
            const { data: lastEvent } = await supabase
                .from('integration_events')
                .select('created_at')
                .eq('integration_id', integrationId)
                .order('created_at', { ascending: false })
                .limit(1);

            const inboundEvents = inboundEventsRes.data || [];
            const outboundQueue = outboundQueueRes.data || [];

            return {
                inbound: {
                    total: inboundEvents.length,
                    pending: inboundEvents.filter(e => e.status === 'pending').length,
                    processed: inboundEvents.filter(e => e.status === 'processed' || e.status === 'processed_shadow').length,
                    failed: inboundEvents.filter(e => e.status === 'failed').length,
                    ignored: inboundEvents.filter(e => e.status === 'ignored').length,
                    today: inboundTodayRes.data?.length || 0,
                    thisWeek: inboundWeekRes.data?.length || 0
                },
                outbound: {
                    total: outboundQueue.length,
                    pending: outboundQueue.filter(e => e.status === 'pending').length,
                    sent: outboundQueue.filter(e => e.status === 'sent').length,
                    failed: outboundQueue.filter(e => e.status === 'failed').length,
                    today: outboundTodayRes.data?.length || 0
                },
                rules: {
                    inboundActive: inboundRulesRes.data?.filter(r => r.is_active).length || 0,
                    outboundActive: outboundRulesRes.data?.filter(r => r.is_active).length || 0
                },
                lastActivity: lastEvent?.[0]?.created_at || null
            };
        },
        refetchInterval: 30000
    });

    // Process pending events
    const handleProcess = async () => {
        setProcessing(true);
        try {
            const { error } = await supabase.functions.invoke('integration-process');
            if (error) throw error;
            toast.success('Eventos processados com sucesso');
            refetch();
        } catch (e: unknown) {
            toast.error(`Erro: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
        } finally {
            setProcessing(false);
        }
    };

    // Sync catalog
    const handleSync = async () => {
        setSyncing(true);
        try {
            const { data, error } = await supabase.functions.invoke('integration-sync-catalog');
            if (error) throw error;
            toast.success(`Catálogo sincronizado: ${data?.fields_synced || 0} campos`);
            refetch();
        } catch (e: unknown) {
            toast.error(`Erro: ${e instanceof Error ? e.message : 'Erro desconhecido'}`);
        } finally {
            setSyncing(false);
        }
    };

    // Health calculation
    const getHealthStatus = () => {
        if (!stats) return { status: 'loading', label: 'Carregando...', color: 'bg-slate-200' };

        const pendingRatio = stats.inbound.pending / Math.max(stats.inbound.total, 1);
        const failedCount = stats.inbound.failed + stats.outbound.failed;

        if (failedCount > 10) {
            return { status: 'critical', label: 'Crítico', color: 'bg-red-500' };
        }
        if (failedCount > 0 || pendingRatio > 0.3) {
            return { status: 'warning', label: 'Atenção', color: 'bg-amber-500' };
        }
        if (stats.inbound.pending > 0) {
            return { status: 'processing', label: 'Processando', color: 'bg-blue-500' };
        }
        return { status: 'healthy', label: 'Saudável', color: 'bg-green-500' };
    };

    const health = getHealthStatus();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Status */}
            <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                        {/* Health Indicator */}
                        <div className="flex items-center gap-4">
                            <div className={`w-4 h-4 rounded-full ${health.color} animate-pulse`} />
                            <div>
                                <h2 className="text-xl font-semibold text-slate-800">
                                    Integração ActiveCampaign
                                </h2>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <Badge
                                        variant="secondary"
                                        className={
                                            health.status === 'healthy' ? 'bg-green-100 text-green-700' :
                                                health.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                    health.status === 'critical' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                        }
                                    >
                                        {health.label}
                                    </Badge>
                                    {stats?.lastActivity && (
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            Última atividade: {formatDistanceToNow(new Date(stats.lastActivity), { addSuffix: true, locale: ptBR })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSync}
                                disabled={syncing}
                                className="gap-2"
                            >
                                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Sincronizar Catálogo
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleProcess}
                                disabled={processing || (stats?.inbound.pending === 0)}
                                className="gap-2 bg-blue-600 hover:bg-blue-700"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                Processar Pendentes ({stats?.inbound.pending || 0})
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Inbound Stats */}
                <Card className="border-green-200 bg-green-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                            <ArrowDownLeft className="w-4 h-4" />
                            Entrada (AC → CRM)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-3xl font-bold text-green-800">{stats?.inbound.processed || 0}</div>
                        <div className="text-xs text-green-600">processados com sucesso</div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-green-200">
                            <div className="flex items-center gap-1 text-xs">
                                <Clock className="w-3 h-3 text-blue-500" />
                                <span className="text-slate-600">{stats?.inbound.pending || 0} pendentes</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                <XCircle className="w-3 h-3 text-red-500" />
                                <span className="text-slate-600">{stats?.inbound.failed || 0} erros</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                <span className="text-slate-600">{stats?.inbound.ignored || 0} ignorados</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                <Activity className="w-3 h-3 text-slate-500" />
                                <span className="text-slate-600">{stats?.inbound.total || 0} total</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Outbound Stats */}
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                            <ArrowUpRight className="w-4 h-4" />
                            Saída (CRM → AC)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-3xl font-bold text-blue-800">{stats?.outbound.sent || 0}</div>
                        <div className="text-xs text-blue-600">enviados com sucesso</div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-blue-200">
                            <div className="flex items-center gap-1 text-xs">
                                <Clock className="w-3 h-3 text-blue-500" />
                                <span className="text-slate-600">{stats?.outbound.pending || 0} na fila</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                <XCircle className="w-3 h-3 text-red-500" />
                                <span className="text-slate-600">{stats?.outbound.failed || 0} erros</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Today Stats */}
                <Card className="border-slate-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
                            <TrendingUp className="w-4 h-4" />
                            Hoje
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-3xl font-bold text-slate-800">{stats?.inbound.today || 0}</div>
                        <div className="text-xs text-slate-500">eventos recebidos</div>
                        <div className="pt-2 border-t border-slate-200">
                            <div className="text-xs text-slate-500">
                                <span className="font-medium">{stats?.outbound.today || 0}</span> enviados para AC
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Rules Stats */}
                <Card className="border-purple-200 bg-purple-50/50">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
                            <Zap className="w-4 h-4" />
                            Regras Ativas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="text-3xl font-bold text-purple-800">
                            {(stats?.rules.inboundActive || 0) + (stats?.rules.outboundActive || 0)}
                        </div>
                        <div className="text-xs text-purple-600">regras configuradas</div>
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-purple-200">
                            <div className="flex items-center gap-1 text-xs">
                                <ArrowDownLeft className="w-3 h-3 text-green-500" />
                                <span className="text-slate-600">{stats?.rules.inboundActive || 0} entrada</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs">
                                <ArrowUpRight className="w-3 h-3 text-blue-500" />
                                <span className="text-slate-600">{stats?.rules.outboundActive || 0} saída</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sync Panel */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-slate-400" />
                        Sincronização Manual
                    </CardTitle>
                    <CardDescription>
                        Importe deals do ActiveCampaign manualmente com filtros específicos
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SyncGovernancePanel />
                </CardContent>
            </Card>

            {/* Recent Events */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Activity className="w-4 h-4 text-slate-400" />
                        Eventos Recentes
                    </CardTitle>
                    <CardDescription>
                        Últimos eventos processados pela integração
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <IntegrationLogs mode="inbox" />
                </CardContent>
            </Card>
        </div>
    );
}
