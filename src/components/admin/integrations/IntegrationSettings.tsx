import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Setting {
    key: string;
    value: string;
    description: string;
}

export function IntegrationSettings() {
    const queryClient = useQueryClient();

    const { data: settings, isLoading } = useQuery({
        queryKey: ['integration-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_settings')
                .select('*')
                .in('key', ['INBOUND_INGEST_ENABLED', 'SHADOW_MODE_ENABLED', 'WRITE_MODE_ENABLED']);

            if (error) throw error;
            return data as Setting[];
        }
    });

    const updateSetting = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            const { error } = await supabase
                .from('integration_settings')
                .update({ value })
                .eq('key', key);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['integration-settings'] });
            toast.success('Configuração atualizada com sucesso');
        },
        onError: (error) => {
            toast.error('Erro ao atualizar configuração: ' + error.message);
        }
    });

    const getSetting = (key: string) => settings?.find(s => s.key === key)?.value === 'true';

    const handleToggle = (key: string, currentValue: boolean) => {
        // Safety checks
        if (key === 'WRITE_MODE_ENABLED' && !currentValue) {
            // Enabling write mode
            if (getSetting('SHADOW_MODE_ENABLED')) {
                toast.error('Você deve desativar o Shadow Mode antes de habilitar a escrita.');
                return;
            }
            const confirm = window.confirm('PERIGO: Você está prestes a habilitar a escrita real no banco de dados. Isso pode alterar dados de clientes e negócios. Tem certeza?');
            if (!confirm) return;
        }

        updateSetting.mutate({ key, value: String(!currentValue) });
    };

    if (isLoading) return <div className="p-4 text-muted-foreground">Carregando configurações...</div>;

    const inboundEnabled = getSetting('INBOUND_INGEST_ENABLED');
    const shadowModeEnabled = getSetting('SHADOW_MODE_ENABLED');
    const writeModeEnabled = getSetting('WRITE_MODE_ENABLED');

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Inbound Control */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-blue-500" />
                                Ingestão de Dados (Inbound)
                            </CardTitle>
                            <CardDescription>
                                Controla se o sistema aceita novos webhooks do ActiveCampaign.
                            </CardDescription>
                        </div>
                        <Switch
                            checked={inboundEnabled}
                            onCheckedChange={() => handleToggle('INBOUND_INGEST_ENABLED', inboundEnabled)}
                        />
                    </div>
                </CardHeader>
            </Card>

            {/* Shadow Mode Control */}
            <Card className={cn("transition-colors", shadowModeEnabled ? "bg-purple-50 border-purple-200" : "")}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <Shield className={cn("w-5 h-5", shadowModeEnabled ? "text-purple-600" : "text-muted-foreground")} />
                                Shadow Mode (Modo Sombra)
                            </CardTitle>
                            <CardDescription>
                                Quando ativo, o sistema processa eventos e simula alterações, mas <strong>NÃO</strong> grava no banco de dados principal.
                            </CardDescription>
                        </div>
                        <Switch
                            checked={shadowModeEnabled}
                            onCheckedChange={() => handleToggle('SHADOW_MODE_ENABLED', shadowModeEnabled)}
                        />
                    </div>
                </CardHeader>
            </Card>

            {/* Danger Zone */}
            <Card className={cn("transition-colors", writeModeEnabled ? "bg-red-50 border-red-200" : "")}>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2 text-red-600">
                                <AlertTriangle className="w-5 h-5" />
                                Write Mode (Modo de Escrita)
                            </CardTitle>
                            <CardDescription className="text-red-600/80">
                                <strong>PERIGO:</strong> Habilita a escrita real nas tabelas do CRM (Cards, Contatos, etc).
                                <br />
                                Requer que o Shadow Mode esteja desligado.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            {writeModeEnabled && <Badge variant="destructive" className="animate-pulse">ATIVO</Badge>}
                            <Switch
                                checked={writeModeEnabled}
                                onCheckedChange={() => handleToggle('WRITE_MODE_ENABLED', writeModeEnabled)}
                                disabled={shadowModeEnabled} // Cannot enable write if shadow is on (UI enforcement)
                            />
                        </div>
                    </div>
                </CardHeader>
            </Card>
        </div>
    );
}
