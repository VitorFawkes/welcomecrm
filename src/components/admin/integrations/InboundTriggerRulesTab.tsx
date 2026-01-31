import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/Input';
import { Plus, Trash2, AlertTriangle, CheckCircle, Zap, X, ArrowRight, User, Target, Pencil, RefreshCw, FileWarning, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { usePipelineStages } from '@/hooks/usePipelineStages';

interface InboundTriggerRulesTabProps {
    integrationId: string;
}

interface Trigger {
    id: string;
    integration_id: string;
    name: string | null;
    // Single fields (legacy)
    external_pipeline_id: string;
    external_stage_id: string;
    // Array fields (new multi-select)
    external_pipeline_ids: string[] | null;
    external_stage_ids: string[] | null;
    external_owner_ids: string[] | null;
    // Target fields (where to create in CRM)
    target_pipeline_id: string | null;
    target_stage_id: string | null;
    action_type: 'create_only' | 'all' | 'update_only';
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

interface CRMPipeline {
    id: string;
    nome: string;
    produto: string;
}

interface IntegrationEvent {
    id: string;
    event_type: string | null;
    entity_type: string | null;
    status: string;
    processing_log: string | null;
    payload: Record<string, unknown> | null;
    created_at: string;
    processed_at: string | null;
}

interface TriggerFormData {
    name: string;
    pipelineIds: string[];
    stageIds: string[];
    ownerIds: string[];
    targetPipelineId: string;
    targetStageId: string;
    actionType: 'create_only' | 'all' | 'update_only';
}

const emptyFormData: TriggerFormData = {
    name: '',
    pipelineIds: [],
    stageIds: [],
    ownerIds: [],
    targetPipelineId: '',
    targetStageId: '',
    actionType: 'create_only'
};

export function InboundTriggerRulesTab({ integrationId }: InboundTriggerRulesTabProps) {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<TriggerFormData>(emptyFormData);
    const [showLogs, setShowLogs] = useState(false);
    const [logFilter, setLogFilter] = useState<'all' | 'errors' | 'success'>('all');

    // Fetch existing triggers
    const { data: triggers, isLoading: triggersLoading } = useQuery({
        queryKey: ['inbound-triggers', integrationId],
        queryFn: async () => {
            const { data, error } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('integration_inbound_triggers' as any) as any)
                .select('*')
                .eq('integration_id', integrationId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as Trigger[];
        }
    });

    // Fetch AC Pipelines from catalog
    const { data: acPipelines } = useQuery({
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
    const { data: acAllStages } = useQuery({
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

    // Fetch AC Owners (users) from catalog
    const { data: acOwners } = useQuery({
        queryKey: ['integration-catalog-owners', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('*')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'user')
                .order('external_name');
            if (error) throw error;
            return data as CatalogItem[];
        }
    });

    // Fetch CRM Pipelines
    const { data: crmPipelines } = useQuery({
        queryKey: ['crm-pipelines'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipelines')
                .select('id, nome, produto')
                .order('nome');
            if (error) throw error;
            return data as CRMPipeline[];
        }
    });

    // Fetch CRM Pipeline Stages
    const { data: crmStages } = usePipelineStages();

    // Fetch Stage Mappings (legado - para inferir target de regras antigas)
    const { data: stageMappings } = useQuery({
        queryKey: ['integration-stage-mappings', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_stage_map')
                .select('*')
                .eq('integration_id', integrationId);
            if (error) throw error;
            return data as { id: string; external_stage_id: string; internal_stage_id: string; pipeline_id: string }[];
        }
    });

    // Fetch Integration Events (últimos 50)
    const { data: integrationEvents, isLoading: logsLoading, refetch: refetchLogs } = useQuery({
        queryKey: ['integration-events-logs', integrationId, showLogs],
        queryFn: async () => {
            if (!showLogs) return [];
            const { data, error } = await supabase
                .from('integration_events')
                .select('id, event_type, entity_type, status, processing_log, payload, created_at, processed_at')
                .eq('integration_id', integrationId)
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data as IntegrationEvent[];
        },
        enabled: showLogs,
        staleTime: 30000, // Cache por 30 segundos
        refetchOnWindowFocus: false // Não recarrega ao focar na janela
    });

    // Filter logs based on selection
    const filteredLogs = integrationEvents?.filter(event => {
        if (logFilter === 'all') return true;
        const isError = event.status === 'failed' || event.status === 'ignored';
        if (logFilter === 'errors') return isError;
        if (logFilter === 'success') return event.status === 'processed' || event.status === 'processed_shadow';
        return true;
    }) || [];

    // Filter AC stages by selected pipelines
    const filteredAcStages = acAllStages?.filter(s =>
        formData.pipelineIds.length === 0 || formData.pipelineIds.includes(s.parent_external_id || '')
    ) || [];

    // Filter CRM stages by selected target pipeline
    const filteredCrmStages = crmStages?.filter(s =>
        s.pipeline_id === formData.targetPipelineId
    ) || [];

    // Create trigger mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            const insertData = {
                integration_id: integrationId,
                name: formData.name || null,
                // Legacy fields - usar primeiro item ou vazio
                external_pipeline_id: formData.pipelineIds[0] || '',
                external_stage_id: formData.stageIds[0] || '',
                // Array fields - null significa "qualquer"
                external_pipeline_ids: formData.pipelineIds.length > 0 ? formData.pipelineIds : null,
                external_stage_ids: formData.stageIds.length > 0 ? formData.stageIds : null,
                external_owner_ids: formData.ownerIds.length > 0 ? formData.ownerIds : null,
                // Target - não precisa para update_only
                target_pipeline_id: formData.actionType !== 'update_only' ? (formData.targetPipelineId || null) : null,
                target_stage_id: formData.actionType !== 'update_only' ? (formData.targetStageId || null) : null,
                action_type: formData.actionType,
                entity_types: ['deal', 'contact'],
                is_active: true
            };

            const { error } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('integration_inbound_triggers' as any) as any)
                .insert(insertData);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbound-triggers'] });
            toast.success('Regra criada com sucesso!');
            resetForm();
        },
        onError: (e: Error) => {
            toast.error(`Erro ao criar regra: ${e.message}`);
        }
    });

    // Update trigger mutation
    const updateMutation = useMutation({
        mutationFn: async (id: string) => {
            const updateData = {
                name: formData.name || null,
                // Legacy fields
                external_pipeline_id: formData.pipelineIds[0] || '',
                external_stage_id: formData.stageIds[0] || '',
                // Array fields - null significa "qualquer"
                external_pipeline_ids: formData.pipelineIds.length > 0 ? formData.pipelineIds : null,
                external_stage_ids: formData.stageIds.length > 0 ? formData.stageIds : null,
                external_owner_ids: formData.ownerIds.length > 0 ? formData.ownerIds : null,
                // Target - não precisa para update_only
                target_pipeline_id: formData.actionType !== 'update_only' ? (formData.targetPipelineId || null) : null,
                target_stage_id: formData.actionType !== 'update_only' ? (formData.targetStageId || null) : null,
                action_type: formData.actionType
            };

            const { error } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('integration_inbound_triggers' as any) as any)
                .update(updateData)
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbound-triggers'] });
            toast.success('Regra atualizada com sucesso!');
            resetForm();
        },
        onError: (e: Error) => {
            toast.error(`Erro ao atualizar regra: ${e.message}`);
        }
    });

    // Toggle trigger mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            const { error } = await (supabase
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('integration_inbound_triggers' as any) as any)
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
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .from('integration_inbound_triggers' as any) as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbound-triggers'] });
            toast.success('Regra removida!');
        }
    });

    // Helper functions
    const getAcPipelineName = (id: string) => acPipelines?.find(p => p.external_id === id)?.external_name || id;
    const getAcStageName = (id: string) => acAllStages?.find(s => s.external_id === id)?.external_name || id;
    const getAcOwnerName = (id: string) => acOwners?.find(o => o.external_id === id)?.external_name || id;
    const getCrmPipelineName = (id: string) => crmPipelines?.find(p => p.id === id)?.nome || id;
    const getCrmStageName = (id: string) => crmStages?.find(s => s.id === id)?.nome || id;

    // Multi-select handlers
    const addToArray = (arr: string[], item: string) => [...arr, item];
    const removeFromArray = (arr: string[], item: string) => arr.filter(i => i !== item);

    const hasNoTriggers = !triggers || triggers.length === 0;

    // Get arrays from trigger (handles both legacy and new format)
    const getTriggerPipelines = (t: Trigger) => t.external_pipeline_ids?.length ? t.external_pipeline_ids : [t.external_pipeline_id];
    const getTriggerStages = (t: Trigger) => t.external_stage_ids?.length ? t.external_stage_ids : [t.external_stage_id];
    const getTriggerOwners = (t: Trigger) => t.external_owner_ids || [];

    // Form helpers
    const resetForm = () => {
        setIsAdding(false);
        setEditingId(null);
        setFormData(emptyFormData);
    };

    const startEditing = (trigger: Trigger) => {
        setEditingId(trigger.id);
        setIsAdding(false);

        // Se não tem target definido, tenta buscar do stage mapping legado
        let targetPipelineId = trigger.target_pipeline_id || '';
        let targetStageId = trigger.target_stage_id || '';

        // Se ainda não tem target, tenta inferir do primeiro stage selecionado via mapping
        if (!targetStageId && stageMappings && getTriggerStages(trigger).length > 0) {
            const firstAcStage = getTriggerStages(trigger)[0];
            const mapping = stageMappings.find(m => m.external_stage_id === firstAcStage);
            if (mapping) {
                targetStageId = mapping.internal_stage_id || '';
                // Buscar o pipeline do CRM a partir do stage
                const crmStage = crmStages?.find(s => s.id === targetStageId);
                if (crmStage) {
                    targetPipelineId = crmStage.pipeline_id || '';
                }
            }
        }

        setFormData({
            name: trigger.name || '',
            pipelineIds: getTriggerPipelines(trigger),
            stageIds: getTriggerStages(trigger),
            ownerIds: getTriggerOwners(trigger),
            targetPipelineId,
            targetStageId,
            actionType: trigger.action_type || 'create_only'
        });
    };

    const startAdding = () => {
        setIsAdding(true);
        setEditingId(null);
        setFormData(emptyFormData);
    };

    const handleSave = () => {
        if (editingId) {
            updateMutation.mutate(editingId);
        } else {
            createMutation.mutate();
        }
    };

    const isFormOpen = isAdding || editingId !== null;
    const isSaving = createMutation.isPending || updateMutation.isPending;

    // Render form (used for both add and edit)
    const renderForm = () => (
        <Card className={`bg-white border-slate-200 shadow-sm border-l-4 ${editingId ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">
                    {editingId ? 'Editar Regra' : 'Nova Regra de Sincronização'}
                </CardTitle>
                <CardDescription>
                    Defina QUANDO (condições do AC), O QUE FAZER (criar ou criar+atualizar) e ONDE (destino no CRM).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Nome da Regra e Tipo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Nome da Regra</label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Ex: SDR Julia - 1 Contato"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">Tipo de Sincronização</label>
                        <Select
                            value={formData.actionType}
                            onChange={(v) => setFormData(prev => ({ ...prev, actionType: v as 'create_only' | 'all' | 'update_only' }))}
                            options={[
                                { value: 'create_only', label: '🆕 Apenas Criação' },
                                { value: 'update_only', label: '✏️ Apenas Atualização' },
                                { value: 'all', label: '🔄 Criação + Atualização' }
                            ]}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            {formData.actionType === 'create_only'
                                ? 'Cria card apenas quando deal é adicionado no AC'
                                : formData.actionType === 'update_only'
                                    ? 'Atualiza card existente quando deal muda no AC (não cria novos)'
                                    : 'Cria e atualiza card quando deal muda no AC'
                            }
                        </p>
                    </div>
                </div>

                {/* QUANDO (ActiveCampaign) */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium text-slate-700 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        QUANDO (ActiveCampaign)
                    </h4>

                    {/* Pipelines Multi-Select */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Pipelines do AC <span className="text-slate-400 font-normal">(vazio = qualquer pipeline)</span>
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {formData.pipelineIds.length === 0 ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    ✓ Qualquer Pipeline
                                </Badge>
                            ) : (
                                formData.pipelineIds.map(id => (
                                    <Badge key={id} variant="secondary" className="gap-1">
                                        {getAcPipelineName(id)}
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                pipelineIds: removeFromArray(prev.pipelineIds, id),
                                                stageIds: [] // Reset stages when pipeline changes
                                            }))}
                                            className="ml-1 hover:bg-slate-300 rounded-full"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>
                        <Select
                            value=""
                            onChange={(v) => {
                                if (v && !formData.pipelineIds.includes(v)) {
                                    setFormData(prev => ({
                                        ...prev,
                                        pipelineIds: addToArray(prev.pipelineIds, v)
                                    }));
                                }
                            }}
                            options={[
                                { value: '', label: 'Adicionar pipeline (ou deixar vazio = qualquer)...' },
                                ...(acPipelines?.filter(p => !formData.pipelineIds.includes(p.external_id))
                                    .map(p => ({ value: p.external_id, label: p.external_name })) || [])
                            ]}
                        />
                    </div>

                    {/* Stages Multi-Select */}
                    <div>
                        <label className="text-sm font-medium mb-2 block">
                            Etapas do AC <span className="text-slate-400 font-normal">(vazio = qualquer etapa)</span>
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {formData.stageIds.length === 0 ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    ✓ Qualquer Etapa
                                </Badge>
                            ) : (
                                formData.stageIds.map(id => (
                                    <Badge key={id} variant="secondary" className="gap-1">
                                        {getAcStageName(id)}
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                stageIds: removeFromArray(prev.stageIds, id)
                                            }))}
                                            className="ml-1 hover:bg-slate-300 rounded-full"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>
                        <Select
                            value=""
                            onChange={(v) => {
                                if (v && !formData.stageIds.includes(v)) {
                                    setFormData(prev => ({
                                        ...prev,
                                        stageIds: addToArray(prev.stageIds, v)
                                    }));
                                }
                            }}
                            options={[
                                { value: '', label: 'Adicionar etapa (ou deixar vazio = qualquer)...' },
                                ...(filteredAcStages.filter(s => !formData.stageIds.includes(s.external_id))
                                    .map(s => ({ value: s.external_id, label: s.external_name })) || [])
                            ]}
                        />
                    </div>

                    {/* Owners Multi-Select */}
                    <div>
                        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-400" />
                            Pessoas do AC <span className="text-slate-400 font-normal">(vazio = qualquer pessoa)</span>
                        </label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {formData.ownerIds.length === 0 ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                    ✓ Qualquer Pessoa
                                </Badge>
                            ) : (
                                formData.ownerIds.map(id => (
                                    <Badge key={id} variant="outline" className="gap-1 bg-white">
                                        {getAcOwnerName(id)}
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                ownerIds: removeFromArray(prev.ownerIds, id)
                                            }))}
                                            className="ml-1 hover:bg-slate-200 rounded-full"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))
                            )}
                        </div>
                        <Select
                            value=""
                            onChange={(v) => {
                                if (v && !formData.ownerIds.includes(v)) {
                                    setFormData(prev => ({
                                        ...prev,
                                        ownerIds: addToArray(prev.ownerIds, v)
                                    }));
                                }
                            }}
                            options={[
                                { value: '', label: 'Adicionar pessoa (ou deixar vazio = qualquer)...' },
                                ...(acOwners?.filter(o => !formData.ownerIds.includes(o.external_id))
                                    .map(o => ({ value: o.external_id, label: o.external_name })) || [])
                            ]}
                        />
                    </div>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                    <ArrowRight className="w-6 h-6 text-slate-400" />
                </div>

                {/* ENTÃO (CRM) - Condicional por tipo */}
                {formData.actionType === 'update_only' ? (
                    <div className="space-y-4 p-4 bg-amber-50 rounded-lg">
                        <h4 className="font-medium text-amber-700 flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 text-amber-500" />
                            ATUALIZAR CARD EXISTENTE NO CRM
                        </h4>
                        <p className="text-sm text-amber-600">
                            Quando o deal for alterado no ActiveCampaign, o card correspondente no CRM será atualizado automaticamente.
                            <br />
                            <strong>Não cria novos cards</strong> - apenas sincroniza alterações em cards já existentes.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-700 flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-500" />
                            {formData.actionType === 'all' ? 'CRIAR/ATUALIZAR CARD EM (CRM)' : 'CRIAR CARD EM (CRM)'}
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-2 block">Produto/Pipeline</label>
                                <Select
                                    value={formData.targetPipelineId}
                                    onChange={(v) => setFormData(prev => ({
                                        ...prev,
                                        targetPipelineId: v,
                                        targetStageId: '' // Reset stage when pipeline changes
                                    }))}
                                    options={[
                                        { value: '', label: 'Selecione o Produto...' },
                                        ...(crmPipelines?.map(p => ({
                                            value: p.id,
                                            label: `${p.produto} - ${p.nome}`
                                        })) || [])
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-2 block">Etapa no CRM</label>
                                <Select
                                    value={formData.targetStageId}
                                    onChange={(v) => setFormData(prev => ({ ...prev, targetStageId: v }))}
                                    options={[
                                        { value: '', label: 'Selecione a Etapa...' },
                                        ...(filteredCrmStages.map(s => ({
                                            value: s.id,
                                            label: s.nome
                                        })) || [])
                                    ]}
                                    disabled={!formData.targetPipelineId}
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2 border-t">
                    <Button
                        onClick={handleSave}
                        disabled={
                            // Para update_only, não precisa de target
                            // Para create_only ou all, precisa de target pipeline e stage
                            (formData.actionType !== 'update_only' && (!formData.targetPipelineId || !formData.targetStageId)) ||
                            isSaving
                        }
                    >
                        {isSaving ? 'Salvando...' : (editingId ? 'Salvar Alterações' : 'Criar Regra')}
                    </Button>
                    <Button variant="ghost" onClick={resetForm}>
                        Cancelar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-6">
            {/* Header with Warning */}
            <Card className="bg-amber-50 border-amber-200">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="w-5 h-5" />
                        Regras de Sincronização Automática
                    </CardTitle>
                    <CardDescription className="text-amber-700">
                        Configure em quais combinações de <strong>Pipeline + Etapa + Pessoa</strong> do ActiveCampaign os Cards serão sincronizados com o CRM.
                        <br />
                        <strong>Tipos:</strong> 🆕 <em>Apenas Criação</em> = cria card quando deal é adicionado | 🔄 <em>Criação + Atualização</em> = cria e sincroniza alterações
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
                            onClick={startAdding}
                            disabled={isFormOpen}
                        >
                            <Plus className="w-4 h-4" />
                            Nova Regra
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
                                    Nenhuma regra configurada. <strong>Todos os eventos</strong> de deal/contact estão sendo processados (comportamento padrão).
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                            <Zap className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium text-blue-800">Filtragem Ativa</p>
                                <p className="text-sm text-blue-700">
                                    <strong>{triggers.filter(t => t.is_active).length}</strong> regra(s) ativa(s). Apenas eventos que correspondem serão processados.
                                </p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add/Edit Form */}
            {isFormOpen && renderForm()}

            {/* List of Triggers */}
            {triggers && triggers.length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Regras Configuradas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {triggers.map(trigger => (
                                <div
                                    key={trigger.id}
                                    className={`p-4 rounded-lg border transition-colors ${
                                        editingId === trigger.id
                                            ? 'bg-amber-50 border-amber-300'
                                            : trigger.is_active
                                                ? 'bg-white border-slate-200'
                                                : 'bg-slate-50 border-slate-100 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <Switch
                                                checked={trigger.is_active}
                                                onCheckedChange={(checked) => toggleMutation.mutate({ id: trigger.id, isActive: checked })}
                                                disabled={editingId === trigger.id}
                                            />
                                            <div className="flex-1 min-w-0">
                                                {/* Rule Name */}
                                                {trigger.name && (
                                                    <p className="font-semibold text-slate-800 mb-2">{trigger.name}</p>
                                                )}

                                                {/* QUANDO */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-medium text-amber-600 uppercase">QUANDO:</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {getTriggerPipelines(trigger).filter(id => id).length > 0 ? (
                                                                getTriggerPipelines(trigger).filter(id => id).map(id => (
                                                                    <Badge key={id} variant="secondary" className="text-xs">
                                                                        {getAcPipelineName(id)}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                    Qualquer Pipeline
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-slate-400">+</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {getTriggerStages(trigger).filter(id => id).length > 0 ? (
                                                                getTriggerStages(trigger).filter(id => id).map(id => (
                                                                    <Badge key={id} variant="outline" className="text-xs">
                                                                        {getAcStageName(id)}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                    Qualquer Etapa
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <span className="text-slate-400">+</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {getTriggerOwners(trigger).length > 0 ? (
                                                                getTriggerOwners(trigger).map(id => (
                                                                    <Badge key={id} className="text-xs bg-purple-100 text-purple-700">
                                                                        <User className="w-3 h-3 mr-1" />
                                                                        {getAcOwnerName(id)}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
                                                                    Qualquer Pessoa
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* ENTÃO */}
                                                    {trigger.action_type === 'update_only' ? (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-medium text-amber-600 uppercase">
                                                                ATUALIZAR:
                                                            </span>
                                                            <Badge className="text-xs bg-amber-100 text-amber-700">
                                                                Card existente no CRM
                                                            </Badge>
                                                        </div>
                                                    ) : (trigger.target_pipeline_id || trigger.target_stage_id) && (
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-medium text-blue-600 uppercase">
                                                                {trigger.action_type === 'all' ? 'CRIAR/ATUALIZAR:' : 'CRIAR EM:'}
                                                            </span>
                                                            {trigger.target_pipeline_id && (
                                                                <Badge className="text-xs bg-blue-100 text-blue-700">
                                                                    {getCrmPipelineName(trigger.target_pipeline_id)}
                                                                </Badge>
                                                            )}
                                                            {trigger.target_stage_id && (
                                                                <>
                                                                    <ArrowRight className="w-3 h-3 text-slate-400" />
                                                                    <Badge className="text-xs bg-green-100 text-green-700">
                                                                        {getCrmStageName(trigger.target_stage_id)}
                                                                    </Badge>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Meta info */}
                                                <div className="text-xs text-muted-foreground mt-2 flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-xs ${
                                                            trigger.action_type === 'all'
                                                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                                                : trigger.action_type === 'update_only'
                                                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                    : ''
                                                        }`}
                                                    >
                                                        {trigger.action_type === 'create_only' ? (
                                                            <>🆕 Apenas Criação</>
                                                        ) : trigger.action_type === 'update_only' ? (
                                                            <>✏️ Apenas Atualização</>
                                                        ) : (
                                                            <><RefreshCw className="w-3 h-3 mr-1 inline" />Criação + Atualização</>
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                onClick={() => startEditing(trigger)}
                                                disabled={isFormOpen && editingId !== trigger.id}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    if (confirm('Remover esta regra?')) {
                                                        deleteMutation.mutate(trigger.id);
                                                    }
                                                }}
                                                disabled={editingId === trigger.id}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Logs de Sincronização */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowLogs(!showLogs)}>
                            {showLogs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileWarning className="w-5 h-5 text-slate-500" />
                                Logs de Sincronização
                            </CardTitle>
                        </div>
                        {showLogs && (
                            <div className="flex items-center gap-2">
                                <Select
                                    value={logFilter}
                                    onChange={(v) => setLogFilter(v as 'all' | 'errors' | 'success')}
                                    options={[
                                        { value: 'all', label: 'Todos' },
                                        { value: 'errors', label: '❌ Apenas Erros' },
                                        { value: 'success', label: '✅ Apenas Sucesso' }
                                    ]}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => refetchLogs()}
                                    className="gap-1"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Atualizar
                                </Button>
                            </div>
                        )}
                    </div>
                    {!showLogs && (
                        <CardDescription>
                            Clique para ver os últimos 50 eventos processados
                        </CardDescription>
                    )}
                </CardHeader>
                {showLogs && (
                    <CardContent>
                        {logsLoading ? (
                            <div className="text-muted-foreground text-sm py-4 text-center">Carregando eventos...</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-muted-foreground text-sm py-4 text-center">
                                Nenhum evento encontrado
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {filteredLogs.map(event => {
                                    const isError = event.status === 'failed';
                                    const isIgnored = event.status === 'ignored';
                                    const isShadow = event.status === 'processed_shadow';

                                    // Extrair título do payload
                                    const payload = event.payload as Record<string, unknown> | null;
                                    const dealTitle = (payload?.title as string) || (payload?.['deal[title]'] as string) || 'Deal sem título';
                                    const contactEmail = (payload?.contact_email as string) || (payload?.['contact[email]'] as string) || null;

                                    const eventTime = event.created_at ? new Date(event.created_at).toLocaleString('pt-BR') : '';

                                    return (
                                        <div
                                            key={event.id}
                                            className={`p-3 rounded-lg border text-sm ${
                                                isError
                                                    ? 'bg-red-50 border-red-200'
                                                    : isIgnored
                                                        ? 'bg-amber-50 border-amber-200'
                                                        : isShadow
                                                            ? 'bg-slate-50 border-slate-200'
                                                            : 'bg-green-50 border-green-200'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {isError ? (
                                                            <Badge className="bg-red-100 text-red-700 text-xs">❌ Erro</Badge>
                                                        ) : isIgnored ? (
                                                            <Badge className="bg-amber-100 text-amber-700 text-xs">⚠️ Ignorado</Badge>
                                                        ) : isShadow ? (
                                                            <Badge className="bg-slate-100 text-slate-700 text-xs">👁️ Shadow</Badge>
                                                        ) : (
                                                            <Badge className="bg-green-100 text-green-700 text-xs">✅ OK</Badge>
                                                        )}
                                                        <Badge variant="outline" className="text-xs">{event.event_type || 'unknown'}</Badge>
                                                        <Badge variant="outline" className="text-xs bg-slate-100">{event.entity_type || 'deal'}</Badge>
                                                        <span className="font-medium truncate">{dealTitle}</span>
                                                    </div>
                                                    {contactEmail && (
                                                        <p className="text-xs text-slate-600 mt-1">
                                                            Contato: {contactEmail}
                                                        </p>
                                                    )}
                                                    {event.processing_log && (
                                                        <p className={`text-xs mt-1 font-mono p-1 rounded ${
                                                            isError ? 'text-red-600 bg-red-100' :
                                                            isIgnored ? 'text-amber-600 bg-amber-100' :
                                                            'text-green-600 bg-green-100'
                                                        }`}>
                                                            {event.processing_log}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 flex items-center gap-1 shrink-0">
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
                )}
            </Card>
        </div>
    );
}
