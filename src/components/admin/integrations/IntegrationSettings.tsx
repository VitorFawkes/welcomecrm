import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Shield, Zap, Key, Eye, EyeOff, Save, TestTube, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Setting {
    key: string;
    value: string;
    description: string;
}

export function IntegrationSettings() {
    const queryClient = useQueryClient();
    const [showApiKey, setShowApiKey] = useState(false);
    const [credentials, setCredentials] = useState({
        apiUrl: '',
        apiKey: ''
    });
    const [credentialsLoaded, setCredentialsLoaded] = useState(false);

    const { data: settings, isLoading } = useQuery({
        queryKey: ['integration-settings'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_settings')
                .select('*');

            if (error) throw error;

            // Load credentials into state
            const settingsMap = (data as Setting[]).reduce((acc, s) => {
                acc[s.key] = s.value;
                return acc;
            }, {} as Record<string, string>);

            if (!credentialsLoaded) {
                setCredentials({
                    apiUrl: settingsMap['ACTIVECAMPAIGN_API_URL'] || '',
                    apiKey: settingsMap['ACTIVECAMPAIGN_API_KEY'] || ''
                });
                setCredentialsLoaded(true);
            }

            return data as Setting[];
        }
    });

    const updateSetting = useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            // Try update first
            const { data: existing } = await supabase
                .from('integration_settings')
                .select('key')
                .eq('key', key)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('integration_settings')
                    .update({ value })
                    .eq('key', key);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('integration_settings')
                    .insert({ key, value, description: '' });
                if (error) throw error;
            }
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

    const saveCredentials = async () => {
        try {
            await updateSetting.mutateAsync({ key: 'ACTIVECAMPAIGN_API_URL', value: credentials.apiUrl });
            await updateSetting.mutateAsync({ key: 'ACTIVECAMPAIGN_API_KEY', value: credentials.apiKey });
            toast.success('Credenciais salvas com sucesso!');
        } catch (error) {
            // Error already handled in mutation
        }
    };

    const testConnection = async () => {
        if (!credentials.apiUrl || !credentials.apiKey) {
            toast.error('Preencha a URL e API Key antes de testar');
            return;
        }

        toast.info('Testando conexão...');

        try {
            // Call the sync-catalog edge function to test
            const { error } = await supabase.functions.invoke('integration-sync-catalog', {
                body: { test_only: true }
            });

            if (error) throw error;
            toast.success('Conexão estabelecida com sucesso!');
        } catch (error: any) {
            toast.error('Falha na conexão: ' + (error.message || 'Erro desconhecido'));
        }
    };

    if (isLoading) return <div className="p-4 text-muted-foreground">Carregando configurações...</div>;

    const inboundEnabled = getSetting('INBOUND_INGEST_ENABLED');
    const shadowModeEnabled = getSetting('SHADOW_MODE_ENABLED');
    const writeModeEnabled = getSetting('WRITE_MODE_ENABLED');
    const hasCredentials = credentials.apiUrl && credentials.apiKey;

    return (
        <div className="space-y-6 max-w-4xl">
            {/* API Credentials */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-orange-500" />
                        Credenciais ActiveCampaign
                    </CardTitle>
                    <CardDescription>
                        Configure a conexão com a API do ActiveCampaign.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">API URL</label>
                        <Input
                            value={credentials.apiUrl}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCredentials(prev => ({ ...prev, apiUrl: e.target.value }))}
                            placeholder="https://sua-conta.api-us1.com"
                        />
                        <p className="text-xs text-muted-foreground">
                            Encontre em ActiveCampaign → Settings → Developer
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                            API Key
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </Button>
                        </label>
                        <Input
                            type={showApiKey ? 'text' : 'password'}
                            value={credentials.apiKey}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCredentials(prev => ({ ...prev, apiKey: e.target.value }))}
                            placeholder="Sua API Key do ActiveCampaign"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <Button onClick={saveCredentials} disabled={updateSetting.isPending}>
                            <Save className="w-4 h-4 mr-1" />
                            Salvar
                        </Button>
                        <Button variant="outline" onClick={testConnection} disabled={!hasCredentials}>
                            <TestTube className="w-4 h-4 mr-1" />
                            Testar Conexão
                        </Button>
                        {hasCredentials && (
                            <Badge variant="outline" className="text-green-600 border-green-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Configurado
                            </Badge>
                        )}
                    </div>
                </CardContent>
            </Card>

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

            {/* Sync Operations */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-yellow-500" />
                                Sincronização Manual
                            </CardTitle>
                            <CardDescription>
                                Force a sincronização de dados do ActiveCampaign.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={async () => {
                                const confirm = window.confirm('Isso irá buscar TODOS os negócios do ActiveCampaign e atualizar o CRM. Pode levar alguns minutos. Deseja continuar?');
                                if (!confirm) return;

                                const toastId = toast.loading('Iniciando sincronização...');
                                try {
                                    const { error } = await supabase.functions.invoke('integration-sync-deals', {
                                        body: { force_update: true }
                                    });
                                    if (error) throw error;
                                    toast.success('Sincronização iniciada com sucesso!', { id: toastId });
                                } catch (err: any) {
                                    toast.error('Erro ao iniciar sincronização: ' + err.message, { id: toastId });
                                }
                            }}
                        >
                            <Zap className="w-4 h-4 mr-2" />
                            Forçar Sincronização Completa
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Use isso se perceber que dados estão desatualizados.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

