import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Save, MessageSquare, Settings, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Select } from '../../components/ui/Select';
import { toast } from 'sonner';

// Types
type WhatsAppConfig = {
    auto_create_leads: boolean;
    default_pipeline_id: string | null;
    default_stage_id: string | null;
};

export default function WhatsAppGovernance() {
    const queryClient = useQueryClient();
    const [config, setConfig] = useState<WhatsAppConfig>({
        auto_create_leads: true,
        default_pipeline_id: null,
        default_stage_id: null
    });

    // Fetch Config
    const { data: remoteConfig, isLoading: isLoadingConfig } = useQuery({
        queryKey: ['whatsapp_config'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('whatsapp_config')
                .select('key, value');

            if (error) throw error;

            const configMap: Record<string, unknown> = {};
            data.forEach(item => {
                configMap[item.key] = item.value;
            });

            return {
                auto_create_leads: configMap.auto_create_leads ?? true,
                default_pipeline_id: configMap.default_pipeline_id ?? null,
                default_stage_id: configMap.default_stage_id ?? null
            } as WhatsAppConfig;
        }
    });

    // Sync state with remote config
    useEffect(() => {
        if (remoteConfig) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setConfig(remoteConfig);
        }
    }, [remoteConfig]);

    // Fetch Pipelines
    const { data: pipelines } = useQuery({
        queryKey: ['pipelines'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipelines')
                .select('id, nome')
                .eq('active', true);
            if (error) throw error;
            return data;
        }
    });

    // Fetch Stages (dependent on selected pipeline)
    const { data: stages } = useQuery({
        queryKey: ['pipeline_stages', config.default_pipeline_id],
        enabled: !!config.default_pipeline_id,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('id, nome')
                .eq('pipeline_id', config.default_pipeline_id!)
                .order('order_index');
            if (error) throw error;
            return data;
        }
    });

    // Mutation to Save Config
    const saveMutation = useMutation({
        mutationFn: async (newConfig: WhatsAppConfig) => {
            const updates = [
                { key: 'auto_create_leads', value: newConfig.auto_create_leads },
                { key: 'default_pipeline_id', value: newConfig.default_pipeline_id },
                { key: 'default_stage_id', value: newConfig.default_stage_id }
            ];

            for (const update of updates) {
                const { error } = await supabase
                    .from('whatsapp_config')
                    .upsert({
                        key: update.key,
                        value: update.value,
                        updated_at: new Date().toISOString()
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success('Configurações salvas com sucesso!');
            queryClient.invalidateQueries({ queryKey: ['whatsapp_config'] });
        },
        onError: (error) => {
            toast.error('Erro ao salvar configurações: ' + error.message);
        }
    });

    const handleSave = () => {
        saveMutation.mutate(config);
    };

    if (isLoadingConfig) {
        return <div className="p-8">Carregando configurações...</div>;
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-emerald-600" />
                        Governança WhatsApp
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Configure como o CRM lida com mensagens e automações do WhatsApp.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saveMutation.isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>

            <div className="grid gap-6">
                {/* Automation Settings */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="w-5 h-5" />
                            Automação de Leads
                        </CardTitle>
                        <CardDescription>
                            Defina o comportamento para mensagens de números desconhecidos.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50 border-border">
                            <div className="space-y-0.5">
                                <label className="text-base font-medium text-foreground">
                                    Criação Automática
                                </label>
                                <p className="text-sm text-muted-foreground">
                                    Criar automaticamente um novo Contato e Lead quando receber mensagem de um número desconhecido.
                                </p>
                            </div>
                            <Switch
                                checked={config.auto_create_leads}
                                onCheckedChange={(checked) => setConfig({ ...config, auto_create_leads: checked })}
                            />
                        </div>

                        {config.auto_create_leads && (
                            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Pipeline Padrão</label>
                                    <Select
                                        value={config.default_pipeline_id || ''}
                                        onChange={(val) => setConfig({ ...config, default_pipeline_id: val, default_stage_id: null })}
                                        options={pipelines?.map(p => ({ value: p.id, label: p.nome })) || []}
                                        placeholder="Selecione um funil"
                                        className="w-full"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-foreground">Etapa Inicial</label>
                                    <Select
                                        value={config.default_stage_id || ''}
                                        onChange={(val) => setConfig({ ...config, default_stage_id: val })}
                                        options={stages?.map(s => ({ value: s.id, label: s.nome })) || []}
                                        placeholder="Selecione uma etapa"
                                        disabled={!config.default_pipeline_id}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        )}

                        {!config.auto_create_leads && (
                            <div className="flex items-center gap-2 p-3 text-sm text-yellow-700 bg-yellow-50 rounded-md border border-yellow-100">
                                <AlertCircle className="w-4 h-4" />
                                Mensagens de desconhecidos serão ignoradas ou criarão apenas logs, sem gerar leads.
                            </div>
                        )}

                    </CardContent>
                </Card>

                {/* Future: AI Settings */}
                <Card className="opacity-50 pointer-events-none grayscale">
                    <CardHeader>
                        <CardTitle>Inteligência Artificial (Em Breve)</CardTitle>
                        <CardDescription>
                            Configurações de prompts e análise de sentimento.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground border-border">
                            Configurações de IA estarão disponíveis na próxima atualização.
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Simple Switch Component (Inline for now to avoid dependency issues if not present)
function Switch({ checked, onCheckedChange }: { checked: boolean; onCheckedChange: (c: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onCheckedChange(!checked)}
            className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background
                ${checked ? 'bg-green-600' : 'bg-gray-200'}
            `}
        >
            <span
                className={`
                    pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform duration-200 ease-in-out
                    ${checked ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
}
