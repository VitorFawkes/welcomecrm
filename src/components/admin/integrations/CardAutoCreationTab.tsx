import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/Select';
import {
    Plus,
    Trash2,
    Zap,
    ArrowRight,
    ChevronDown,
    ChevronUp,
    X,
    User,
    Layers,
    GitBranch
} from 'lucide-react';
import { useCardAutoCreationRules, usePipelines } from '@/hooks/useCardAutoCreationRules';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import { useUsers } from '@/hooks/useUsers';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface NewRuleForm {
    sourcePipelineIds: string[];
    sourceStageIds: string[];
    sourceOwnerIds: string[];
    targetPipelineId: string;
    targetStageId: string;
    targetOwnerMode: 'same_as_source' | 'specific';
    targetOwnerId: string;
    copyTitle: boolean;
    copyContacts: boolean;
    titlePrefix: string;
    description: string;
}

const initialFormState: NewRuleForm = {
    sourcePipelineIds: [],
    sourceStageIds: [],
    sourceOwnerIds: [],
    targetPipelineId: '',
    targetStageId: '',
    targetOwnerMode: 'same_as_source',
    targetOwnerId: '',
    copyTitle: true,
    copyContacts: true,
    titlePrefix: '',
    description: '',
};

export function CardAutoCreationTab() {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState<NewRuleForm>(initialFormState);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

    // Hooks
    const {
        rules,
        isLoading,
        createRule,
        isCreating,
        toggleRule,
        deleteRule
    } = useCardAutoCreationRules();

    const { data: pipelines } = usePipelines();
    const { data: allStages } = usePipelineStages();
    const { users } = useUsers();

    // Filtrar stages pelos pipelines selecionados
    const availableSourceStages = useMemo(() => {
        if (!allStages || formData.sourcePipelineIds.length === 0) return [];
        return allStages.filter(s => formData.sourcePipelineIds.includes(s.pipeline_id));
    }, [allStages, formData.sourcePipelineIds]);

    const availableTargetStages = useMemo(() => {
        if (!allStages || !formData.targetPipelineId) return [];
        return allStages.filter(s => s.pipeline_id === formData.targetPipelineId);
    }, [allStages, formData.targetPipelineId]);

    // Handlers para multi-select
    const toggleSourcePipeline = (id: string) => {
        setFormData(prev => {
            const newIds = prev.sourcePipelineIds.includes(id)
                ? prev.sourcePipelineIds.filter(x => x !== id)
                : [...prev.sourcePipelineIds, id];
            // Limpar stages que não pertencem mais aos pipelines selecionados
            const validStageIds = prev.sourceStageIds.filter(stageId => {
                const stage = allStages?.find(s => s.id === stageId);
                return stage && newIds.includes(stage.pipeline_id);
            });
            return { ...prev, sourcePipelineIds: newIds, sourceStageIds: validStageIds };
        });
    };

    const toggleSourceStage = (id: string) => {
        setFormData(prev => ({
            ...prev,
            sourceStageIds: prev.sourceStageIds.includes(id)
                ? prev.sourceStageIds.filter(x => x !== id)
                : [...prev.sourceStageIds, id]
        }));
    };

    const toggleSourceOwner = (id: string) => {
        setFormData(prev => ({
            ...prev,
            sourceOwnerIds: prev.sourceOwnerIds.includes(id)
                ? prev.sourceOwnerIds.filter(x => x !== id)
                : [...prev.sourceOwnerIds, id]
        }));
    };

    const handleCreate = () => {
        if (formData.sourcePipelineIds.length === 0 || formData.sourceStageIds.length === 0) {
            return;
        }
        if (!formData.targetPipelineId || !formData.targetStageId) {
            return;
        }

        createRule({
            source_pipeline_ids: formData.sourcePipelineIds,
            source_stage_ids: formData.sourceStageIds,
            source_owner_ids: formData.sourceOwnerIds.length > 0 ? formData.sourceOwnerIds : null,
            target_pipeline_id: formData.targetPipelineId,
            target_stage_id: formData.targetStageId,
            target_owner_mode: formData.targetOwnerMode,
            target_owner_id: formData.targetOwnerMode === 'specific' ? formData.targetOwnerId : null,
            copy_title: formData.copyTitle,
            copy_contacts: formData.copyContacts,
            title_prefix: formData.titlePrefix || null,
            description: formData.description || null,
        });

        setIsAdding(false);
        setFormData(initialFormState);
    };

    const handleDelete = (id: string) => {
        deleteRule(id);
        setDeleteConfirmId(null);
    };

    const canSubmit = formData.sourcePipelineIds.length > 0 &&
        formData.sourceStageIds.length > 0 &&
        formData.targetPipelineId &&
        formData.targetStageId;

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-purple-800">
                        <Zap className="w-5 h-5" />
                        Criação Automática de Cards
                    </CardTitle>
                    <CardDescription className="text-purple-700">
                        Configure regras para criar cards automaticamente quando um card entrar em determinada etapa.
                        <br />
                        <strong>Exemplo:</strong> Quando card entrar em "1 Contato" com Julia, criar card em "Briefing Agendado".
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Status Card */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Regras Configuradas</CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsAdding(true)}
                            disabled={isAdding}
                        >
                            <Plus className="w-4 h-4" />
                            Nova Regra
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-muted-foreground text-sm">Carregando...</div>
                    ) : rules.length === 0 ? (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
                            <p className="text-sm text-slate-600">
                                Nenhuma regra configurada. Clique em "Nova Regra" para começar.
                            </p>
                        </div>
                    ) : (
                        <div className="text-sm text-slate-600">
                            <strong>{rules.filter(r => r.is_active).length}</strong> regra(s) ativa(s) de {rules.length} total.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add New Rule Form */}
            {isAdding && (
                <Card className="bg-white border-slate-200 shadow-sm border-l-4 border-l-purple-500">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Nova Regra de Criação Automática</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* QUANDO */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm text-slate-700 flex items-center gap-2">
                                <GitBranch className="w-4 h-4" />
                                QUANDO card entrar em:
                            </h4>

                            {/* Produtos/Pipelines */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Produtos <span className="text-slate-400">(selecione um ou mais)</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {pipelines?.map(pipeline => (
                                        <Badge
                                            key={pipeline.id}
                                            variant={formData.sourcePipelineIds.includes(pipeline.id) ? "default" : "outline"}
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => toggleSourcePipeline(pipeline.id)}
                                        >
                                            {pipeline.produto}
                                            {formData.sourcePipelineIds.includes(pipeline.id) && (
                                                <X className="w-3 h-3 ml-1" />
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {/* Etapas */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Etapas <span className="text-slate-400">(selecione uma ou mais)</span>
                                </label>
                                {formData.sourcePipelineIds.length === 0 ? (
                                    <p className="text-sm text-slate-400">Selecione um produto primeiro</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-slate-50">
                                        {availableSourceStages.map(stage => (
                                            <Badge
                                                key={stage.id}
                                                variant={formData.sourceStageIds.includes(stage.id) ? "default" : "outline"}
                                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={() => toggleSourceStage(stage.id)}
                                            >
                                                {stage.nome}
                                                {formData.sourceStageIds.includes(stage.id) && (
                                                    <X className="w-3 h-3 ml-1" />
                                                )}
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Pessoas (opcional) */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">
                                    Pessoas <span className="text-slate-400">(opcional - vazio = qualquer pessoa)</span>
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-md bg-slate-50">
                                    {users?.filter(u => u.active).map(user => (
                                        <Badge
                                            key={user.id}
                                            variant={formData.sourceOwnerIds.includes(user.id) ? "default" : "outline"}
                                            className="cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => toggleSourceOwner(user.id)}
                                        >
                                            <User className="w-3 h-3 mr-1" />
                                            {user.nome}
                                            {formData.sourceOwnerIds.includes(user.id) && (
                                                <X className="w-3 h-3 ml-1" />
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Seta */}
                        <div className="flex items-center justify-center py-2">
                            <ArrowRight className="w-6 h-6 text-purple-500" />
                        </div>

                        {/* ENTÃO */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-sm text-slate-700 flex items-center gap-2">
                                <Layers className="w-4 h-4" />
                                CRIAR novo card em:
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Produto Destino</label>
                                    <Select
                                        value={formData.targetPipelineId}
                                        onChange={(v) => setFormData(prev => ({ ...prev, targetPipelineId: v, targetStageId: '' }))}
                                        options={[
                                            { value: '', label: 'Selecione...' },
                                            ...(pipelines?.map(p => ({ value: p.id, label: p.produto })) || [])
                                        ]}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-2 block">Etapa Destino</label>
                                    <Select
                                        value={formData.targetStageId}
                                        onChange={(v) => setFormData(prev => ({ ...prev, targetStageId: v }))}
                                        options={[
                                            { value: '', label: 'Selecione...' },
                                            ...(availableTargetStages.map(s => ({ value: s.id, label: s.nome })) || [])
                                        ]}
                                        disabled={!formData.targetPipelineId}
                                    />
                                </div>
                            </div>

                            {/* Owner do novo card */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Responsável do novo card</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.targetOwnerMode === 'same_as_source'}
                                            onChange={() => setFormData(prev => ({ ...prev, targetOwnerMode: 'same_as_source', targetOwnerId: '' }))}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Mesmo do card original</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={formData.targetOwnerMode === 'specific'}
                                            onChange={() => setFormData(prev => ({ ...prev, targetOwnerMode: 'specific' }))}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm">Pessoa específica</span>
                                    </label>
                                </div>
                                {formData.targetOwnerMode === 'specific' && (
                                    <div className="mt-2">
                                        <Select
                                            value={formData.targetOwnerId}
                                            onChange={(v) => setFormData(prev => ({ ...prev, targetOwnerId: v }))}
                                            options={[
                                                { value: '', label: 'Selecione...' },
                                                ...(users?.filter(u => u.active).map(u => ({ value: u.id, label: u.nome })) || [])
                                            ]}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Opções */}
                        <OptionsSection formData={formData} setFormData={setFormData} />

                        {/* Botões */}
                        <div className="flex items-center gap-3 pt-2 border-t">
                            <Button
                                onClick={handleCreate}
                                disabled={!canSubmit || isCreating}
                            >
                                {isCreating ? 'Salvando...' : 'Salvar Regra'}
                            </Button>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsAdding(false);
                                    setFormData(initialFormState);
                                }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* List of Rules */}
            {rules.length > 0 && (
                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Regras</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {rules.map(rule => (
                                <RuleCard
                                    key={rule.id}
                                    rule={rule}
                                    pipelines={pipelines}
                                    stages={allStages}
                                    users={users}
                                    onToggle={(isActive) => toggleRule({ id: rule.id, isActive })}
                                    onDelete={() => setDeleteConfirmId(rule.id)}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remover regra?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação não pode ser desfeita. A regra será removida permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Remover
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Componente auxiliar para opções avançadas
function OptionsSection({
    formData,
    setFormData
}: {
    formData: NewRuleForm;
    setFormData: React.Dispatch<React.SetStateAction<NewRuleForm>>;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border rounded-md">
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
                <span>Opções avançadas</span>
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded && (
                <div className="p-4 pt-0 space-y-4 border-t">
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.copyTitle}
                                onChange={(e) => setFormData(prev => ({ ...prev, copyTitle: e.target.checked }))}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Copiar título</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.copyContacts}
                                onChange={(e) => setFormData(prev => ({ ...prev, copyContacts: e.target.checked }))}
                                className="w-4 h-4"
                            />
                            <span className="text-sm">Copiar contatos</span>
                        </label>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Prefixo do título</label>
                        <input
                            type="text"
                            value={formData.titlePrefix}
                            onChange={(e) => setFormData(prev => ({ ...prev, titlePrefix: e.target.value }))}
                            placeholder="Ex: [Briefing] "
                            className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Descrição da regra</label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Ex: Criar briefing para equipe de planejamento"
                            className="w-full px-3 py-2 border rounded-md text-sm"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// Componente para exibir uma regra
function RuleCard({
    rule,
    pipelines,
    stages,
    users,
    onToggle,
    onDelete
}: {
    rule: ReturnType<typeof useCardAutoCreationRules>['rules'][0];
    pipelines: ReturnType<typeof usePipelines>['data'];
    stages: ReturnType<typeof usePipelineStages>['data'];
    users: ReturnType<typeof useUsers>['users'];
    onToggle: (isActive: boolean) => void;
    onDelete: () => void;
}) {
    const getPipelineName = (id: string) => pipelines?.find(p => p.id === id)?.produto || id;
    const getStageName = (id: string) => stages?.find(s => s.id === id)?.nome || id;
    const getOwnerName = (id: string) => users?.find(u => u.id === id)?.nome || id;

    return (
        <div
            className={`p-4 rounded-lg border transition-colors ${rule.is_active
                ? 'bg-white border-slate-200'
                : 'bg-slate-50 border-slate-100 opacity-60'
                }`}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                    <Switch
                        checked={rule.is_active}
                        onCheckedChange={onToggle}
                    />
                    <div className="space-y-2 flex-1">
                        {/* Origem */}
                        <div className="text-sm">
                            <span className="text-slate-500">Quando:</span>{' '}
                            <span className="font-medium">
                                {rule.source_pipeline_ids.map(id => getPipelineName(id)).join(', ')}
                            </span>
                            {' → '}
                            <span className="flex flex-wrap gap-1 inline">
                                {rule.source_stage_ids.map(id => (
                                    <Badge key={id} variant="secondary" className="text-xs">
                                        {getStageName(id)}
                                    </Badge>
                                ))}
                            </span>
                            {rule.source_owner_ids && rule.source_owner_ids.length > 0 && (
                                <>
                                    {' → '}
                                    <span className="flex flex-wrap gap-1 inline">
                                        {rule.source_owner_ids.map(id => (
                                            <Badge key={id} variant="outline" className="text-xs">
                                                <User className="w-3 h-3 mr-1" />
                                                {getOwnerName(id)}
                                            </Badge>
                                        ))}
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Destino */}
                        <div className="text-sm flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-purple-500" />
                            <span className="text-slate-500">Criar em:</span>{' '}
                            <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                                {rule.target_pipeline?.produto || getPipelineName(rule.target_pipeline_id)}
                                {' / '}
                                {rule.target_stage?.nome || getStageName(rule.target_stage_id)}
                            </Badge>
                        </div>

                        {/* Descrição */}
                        {rule.description && (
                            <p className="text-xs text-slate-500 italic">{rule.description}</p>
                        )}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={onDelete}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}
