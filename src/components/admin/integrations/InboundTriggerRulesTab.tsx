import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, AlertTriangle, CheckCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface InboundTriggerRulesTabProps {
    integrationId: string;
}

interface Trigger {
    id: string;
    integration_id: string;
    external_pipeline_id: string;
    external_stage_id: string;
    action_type: 'create_only' | 'all';
    entity_types: string[];
    is_active: boolean;
    description: string | null;
    created_at: string;
}

interface CatalogItem {
    id: string;
    external_id: string;
    external_name: string;
    parent_external_id?: string;
}

export function InboundTriggerRulesTab({ integrationId }: InboundTriggerRulesTabProps) {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [newTrigger, setNewTrigger] = useState({
        pipelineId: '',
        stageId: '',
        description: ''
    });

    // Fetch existing triggers
    const { data: triggers, isLoading: triggersLoading } = useQuery({
        queryKey: ['inbound-triggers', integrationId],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('integration_inbound_triggers' as never) as any)
                .select('*')
                .eq('integration_id', integrationId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Trigger[];
        }
    });

    // Fetch AC Pipelines from catalog
    const { data: pipelines } = useQuery({
        queryKey: ['integration-catalog-pipelines', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('*')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'pipeline')
                .order('external_name');
            if (error) throw error;
            return data as CatalogItem[];
        }
    });

    // Fetch AC Stages from catalog
    const { data: allStages } = useQuery({
        queryKey: ['integration-catalog-stages', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('*')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'stage')
                .order('external_name');
            if (error) throw error;
            return data as CatalogItem[];
        }
    });

    // Filter stages by selected pipeline
    const filteredStages = allStages?.filter(s => s.parent_external_id === newTrigger.pipelineId) || [];

    // Create trigger mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            const { error } = await (supabase
                .from('integration_inbound_triggers' as never) as any)
                .insert({
                    integration_id: integrationId,
                    external_pipeline_id: newTrigger.pipelineId,
                    external_stage_id: newTrigger.stageId,
                    action_type: 'create_only',
                    entity_types: ['deal', 'contact'],
                    is_active: true,
                    description: newTrigger.description || null
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbound-triggers'] });
            toast.success('Gatilho criado com sucesso!');
            setIsAdding(false);
            setNewTrigger({ pipelineId: '', stageId: '', description: '' });
        },
        onError: (e: Error) => {
            toast.error(`Erro ao criar gatilho: ${e.message}`);
        }
    });

    // Toggle trigger mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await (supabase
                .from('integration_inbound_triggers' as never) as any)
                .update({ is_active: isActive })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbound-triggers'] });
            toast.success('Status atualizado!');
        }
    });

    // Delete trigger mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase
                .from('integration_inbound_triggers' as never) as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbound-triggers'] });
            toast.success('Gatilho removido!');
        }
    });

    // Get pipeline/stage names for display
    const getPipelineName = (id: string) => pipelines?.find(p => p.external_id === id)?.external_name || id;
    const getStageName = (id: string) => allStages?.find(s => s.external_id === id)?.external_name || id;

    const hasNoTriggers = !triggers || triggers.length === 0;

    return (
        <div className="space-y-6">
            {/* Header with Warning */}
            <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="w-5 h-5" />
                        Gatilhos de Entrada
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                        Configure em quais combinações de <strong>Pipeline + Etapa</strong> os Deals e Contatos serão criados automaticamente.
                        <br />
                        <strong>Importante:</strong> Apenas eventos de criação (<code>deal_add</code>) serão processados. Atualizações e movimentações são ignoradas.
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Current Status */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Status Atual</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsAdding(true)}
                            disabled={isAdding}
                        >
                            <Plus className="w-4 h-4" />
                            Novo Gatilho
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {triggersLoading ? (
                        <div className="text-muted-foreground text-sm">Carregando...</div>
                    ) : hasNoTriggers ? (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium text-green-800">Modo Legado Ativo</p>
                                <p className="text-sm text-green-700">
                                    Nenhum gatilho configurado. <strong>Todos os eventos</strong> de deal/contact estão sendo processados (comportamento padrão).
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                            <Zap className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium text-blue-800">Filtragem Ativa</p>
                                <p className="text-sm text-blue-700">
                                    <strong>{triggers.filter(t => t.is_active).length}</strong> gatilho(s) ativo(s). Apenas eventos que correspondem serão processados.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add New Trigger Form */}
            {isAdding && (
                <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Novo Gatilho</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Pipeline (AC)</label>
                                <Select
                                    value={newTrigger.pipelineId}
                                    onChange={(v) => setNewTrigger(prev => ({ ...prev, pipelineId: v, stageId: '' }))}
                                    options={[
                                        { value: '', label: 'Selecione o Pipeline...' },
                                        ...(pipelines?.map(p => ({ value: p.external_id, label: p.external_name })) || [])
                                    ]}
                                    placeholder="Selecione..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Etapa (AC)</label>
                                <Select
                                    value={newTrigger.stageId}
                                    onChange={(v) => setNewTrigger(prev => ({ ...prev, stageId: v }))}
                                    options={[
                                        { value: '', label: 'Selecione a Etapa...' },
                                        ...(filteredStages.map(s => ({ value: s.external_id, label: s.external_name })) || [])
                                    ]}
                                    disabled={!newTrigger.pipelineId}
                                    placeholder="Selecione..."
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                onClick={() => createMutation.mutate()}
                                disabled={!newTrigger.pipelineId || !newTrigger.stageId || createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Salvando...' : 'Salvar Gatilho'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsAdding(false);
                                    setNewTrigger({ pipelineId: '', stageId: '', description: '' });
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List of Triggers */}
            {triggers && triggers.length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Gatilhos Configurados</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {triggers.map(trigger => (
                                <div
                                    key={trigger.id}
                                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${trigger.is_active
                                        ? 'bg-white border-slate-200'
                                        : 'bg-slate-50 border-slate-100 opacity-60'
                                        }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <Switch
                                            checked={trigger.is_active}
                                            onCheckedChange={(checked) => toggleMutation.mutate({ id: trigger.id, isActive: checked })}
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{getPipelineName(trigger.external_pipeline_id)}</span>
                                                <span className="text-muted-foreground">→</span>
                                                <Badge variant="secondary">{getStageName(trigger.external_stage_id)}</Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                    {trigger.action_type === 'create_only' ? 'Apenas Criação' : 'Todos Eventos'}
                                                </Badge>
                                                <span>•</span>
                                                <span>Entities: {trigger.entity_types.join(', ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                        onClick={() => {
                                            if (confirm('Remover este gatilho?')) {
                                                deleteMutation.mutate(trigger.id);
                                            }
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
