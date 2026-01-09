import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { GitBranch, User, Check } from 'lucide-react';
import { toast } from 'sonner';

export function IntegrationMapping() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'stages' | 'users'>('stages');

    // --- Queries ---

    // 1. Fetch ActiveCampaign Integration ID
    const { data: integrationId } = useQuery({
        queryKey: ['active-campaign-integration-id'],
        queryFn: async () => {
            const { data } = await supabase
                .from('integrations')
                .select('id')
                .eq('provider', 'active_campaign')
                .single();
            return data?.id;
        }
    });

    // 2. Fetch Internal Pipelines & Stages
    const { data: internalPipelines } = useQuery({
        queryKey: ['pipelines-full'],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipelines')
                .select('id, nome, pipeline_stages(id, nome, ordem)');
            return data || [];
        }
    });

    // 3. Fetch Internal Users
    const { data: internalUsers } = useQuery({
        queryKey: ['profiles-list'],
        queryFn: async () => {
            const { data } = await supabase
                .from('profiles')
                .select('id, nome, email')
                .eq('active', true);
            return data || [];
        }
    });

    // 4. Fetch Existing Mappings
    const { data: stageMappings } = useQuery({
        queryKey: ['integration-stage-map', integrationId],
        enabled: !!integrationId,
        queryFn: async () => {
            if (!integrationId) return [];
            const { data } = await supabase
                .from('integration_stage_map')
                .select('*')
                .eq('integration_id', integrationId);
            return data || [];
        }
    });

    const { data: userMappings } = useQuery({
        queryKey: ['integration-user-map', integrationId],
        enabled: !!integrationId,
        queryFn: async () => {
            if (!integrationId) return [];
            const { data } = await supabase
                .from('integration_user_map')
                .select('*')
                .eq('integration_id', integrationId);
            return data || [];
        }
    });

    // 5. Audit: Detect External Stages/Users from Events
    const { data: detectedStages } = useQuery({
        queryKey: ['detected-stages', integrationId],
        enabled: !!integrationId,
        queryFn: async () => {
            const { data } = await supabase
                .from('integration_events')
                .select('payload')
                .eq('entity_type', 'deal')
                .order('created_at', { ascending: false })
                .limit(1000);

            const stages = new Map<string, { id: string, name: string, pipeline: string }>();

            data?.forEach(event => {
                const p = event.payload as any;
                if (p.stage_id && p.pipeline_id) {
                    const key = `${p.pipeline_id}:${p.stage_id}`;
                    if (!stages.has(key)) {
                        stages.set(key, {
                            id: p.stage_id,
                            name: p.stage_title || `Stage ${p.stage_id}`,
                            pipeline: p.pipeline_id
                        });
                    }
                }
            });
            return Array.from(stages.values());
        }
    });

    const { data: detectedUsers } = useQuery({
        queryKey: ['detected-users', integrationId],
        enabled: !!integrationId,
        queryFn: async () => {
            const { data } = await supabase
                .from('integration_events')
                .select('payload')
                .order('created_at', { ascending: false })
                .limit(1000);

            const users = new Map<string, { id: string, name: string }>();

            data?.forEach(event => {
                const p = event.payload as any;
                if (p.owner_id) {
                    if (!users.has(p.owner_id)) {
                        users.set(p.owner_id, {
                            id: p.owner_id,
                            name: p.owner_name || `User ${p.owner_id}`
                        });
                    }
                }
            });
            return Array.from(users.values());
        }
    });

    // --- Mutations ---

    const saveStageMapping = useMutation({
        mutationFn: async ({ externalId, pipelineId, internalStageId, externalName }: any) => {
            if (!integrationId) return;
            const { error } = await supabase
                .from('integration_stage_map')
                .upsert({
                    integration_id: integrationId,
                    pipeline_id: pipelineId,
                    external_stage_id: externalId,
                    external_stage_name: externalName,
                    internal_stage_id: internalStageId
                }, { onConflict: 'integration_id,pipeline_id,external_stage_id' });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Mapeamento de estágio salvo');
            queryClient.invalidateQueries({ queryKey: ['integration-stage-map'] });
        },
        onError: (e) => toast.error('Erro ao salvar: ' + e.message)
    });

    const saveUserMapping = useMutation({
        mutationFn: async ({ externalId, internalUserId }: any) => {
            if (!integrationId) return;
            const { error } = await supabase
                .from('integration_user_map')
                .upsert({
                    integration_id: integrationId,
                    external_user_id: externalId,
                    internal_user_id: internalUserId
                }, { onConflict: 'integration_id,external_user_id' });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Mapeamento de usuário salvo');
            queryClient.invalidateQueries({ queryKey: ['integration-user-map'] });
        },
        onError: (e) => toast.error('Erro ao salvar: ' + e.message)
    });

    // --- Options Preparation ---
    const stageOptions = internalPipelines?.flatMap(p =>
        p.pipeline_stages?.sort((a: any, b: any) => a.ordem - b.ordem).map((s: any) => ({
            value: s.id,
            label: `[${p.nome}] ${s.nome}`
        })) || []
    ) || [];

    const userOptions = internalUsers?.map(u => ({
        value: u.id,
        label: `${u.nome} (${u.email})`
    })) || [];

    // --- Render ---

    return (
        <div className="space-y-6">
            <div className="flex gap-4 border-b border-border pb-4">
                <Button
                    variant={activeTab === 'stages' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('stages')}
                    className="gap-2"
                >
                    <GitBranch className="w-4 h-4" />
                    Mapeamento de Estágios
                </Button>
                <Button
                    variant={activeTab === 'users' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('users')}
                    className="gap-2"
                >
                    <User className="w-4 h-4" />
                    Mapeamento de Usuários
                </Button>
            </div>

            {activeTab === 'stages' && (
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-foreground">Estágios Detectados (Pipelines 6 e 8)</CardTitle>
                        <CardDescription>
                            Associe os estágios do ActiveCampaign aos estágios do Welcome CRM.
                            <br />
                            <span className="text-yellow-500">Atenção:</span> Estágios não mapeados bloquearão a sincronização.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {detectedStages?.map(stage => {
                                const mapping = stageMappings?.find(
                                    m => m.pipeline_id === stage.pipeline && m.external_stage_id === stage.id
                                );

                                return (
                                    <div key={`${stage.pipeline}:${stage.id}`} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">Pipeline {stage.pipeline}</Badge>
                                                <span className="font-medium text-foreground">{stage.name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">ID: {stage.id}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-[300px]">
                                                <Select
                                                    value={mapping?.internal_stage_id || ''}
                                                    onChange={(val) => saveStageMapping.mutate({
                                                        externalId: stage.id,
                                                        pipelineId: stage.pipeline,
                                                        externalName: stage.name,
                                                        internalStageId: val
                                                    })}
                                                    options={stageOptions}
                                                    placeholder="Selecione o estágio..."
                                                />
                                            </div>
                                            {mapping && <Check className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                    </div>
                                );
                            })}
                            {(!detectedStages || detectedStages.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum estágio detectado ainda. Importe eventos ou aguarde webhooks.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {activeTab === 'users' && (
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="text-foreground">Usuários Detectados</CardTitle>
                        <CardDescription>
                            Associe os donos de deals do ActiveCampaign aos usuários do Welcome CRM.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {detectedUsers?.map(user => {
                                const mapping = userMappings?.find(
                                    m => m.external_user_id === user.id
                                );

                                return (
                                    <div key={user.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">{user.name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">ID: {user.id}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-[300px]">
                                                <Select
                                                    value={mapping?.internal_user_id || ''}
                                                    onChange={(val) => saveUserMapping.mutate({
                                                        externalId: user.id,
                                                        internalUserId: val
                                                    })}
                                                    options={userOptions}
                                                    placeholder="Selecione o usuário..."
                                                />
                                            </div>
                                            {mapping && <Check className="w-4 h-4 text-emerald-500" />}
                                        </div>
                                    </div>
                                );
                            })}
                            {(!detectedUsers || detectedUsers.length === 0) && (
                                <div className="text-center py-8 text-muted-foreground">
                                    Nenhum usuário detectado ainda.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
