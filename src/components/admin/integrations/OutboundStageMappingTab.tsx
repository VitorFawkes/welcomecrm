import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { ArrowUpRight, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WelcomeStage {
    id: string;
    nome: string;
    pipeline_id: string;
    phase_id: string | null;
    phase?: {
        label: string;
        color: string;
    };
}

interface ExternalStage {
    external_id: string;
    external_name: string;
}

interface OutboundStageMap {
    id: string;
    integration_id: string;
    internal_stage_id: string;
    external_stage_id: string;
    external_stage_name: string | null;
    is_active: boolean;
}

interface OutboundStageMappingTabProps {
    integrationId: string;
}

export function OutboundStageMappingTab({ integrationId }: OutboundStageMappingTabProps) {
    const queryClient = useQueryClient();
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

    // Fetch Welcome stages
    const { data: welcomeStages, isLoading: stagesLoading } = useQuery({
        queryKey: ['welcome-stages-for-outbound'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select(`
                    id, nome, pipeline_id, phase_id,
                    phase:pipeline_phases(label, color)
                `)
                .eq('ativo', true)
                .order('ordem');
            if (error) throw error;
            return data as WelcomeStage[];
        }
    });

    // Fetch external stages from catalog
    const { data: externalStages, isLoading: externalLoading } = useQuery({
        queryKey: ['external-stages-catalog', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'stage');
            if (error) throw error;
            return data as ExternalStage[];
        }
    });

    // Fetch existing outbound mappings
    const { data: existingMappings, isLoading: mappingsLoading } = useQuery({
        queryKey: ['outbound-stage-mappings', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_outbound_stage_map' as never)
                .select('*')
                .eq('integration_id', integrationId);
            if (error) throw error;
            return data as unknown as OutboundStageMap[];
        }
    });

    // Save mapping mutation
    const saveMappingMutation = useMutation({
        mutationFn: async ({ internalStageId, externalStageId }: { internalStageId: string, externalStageId: string | null }) => {
            // Delete existing mapping for this internal stage
            await (supabase
                .from('integration_outbound_stage_map' as never)
                .delete as Function)()

            // If externalStageId is provided, create new mapping
            if (externalStageId) {
                const externalStage = externalStages?.find(s => s.external_id === externalStageId);
                const { error } = await (supabase
                    .from('integration_outbound_stage_map' as never)
                    .insert as Function)({
                        integration_id: integrationId,
                        internal_stage_id: internalStageId,
                        external_stage_id: externalStageId,
                        external_stage_name: externalStage?.external_name || null,
                        is_active: true
                    });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outbound-stage-mappings'] });
            toast.success('Mapeamento salvo');
        },
        onError: (e) => toast.error(`Erro: ${e.message}`)
    });

    // Get current mapping for a stage
    const getMappingForStage = (stageId: string): string | null => {
        if (pendingChanges[stageId] !== undefined) {
            return pendingChanges[stageId] || null;
        }
        const mapping = existingMappings?.find(m => m.internal_stage_id === stageId && m.is_active);
        return mapping?.external_stage_id || null;
    };

    const handleExternalStageChange = (internalStageId: string, externalStageId: string) => {
        setPendingChanges(prev => ({
            ...prev,
            [internalStageId]: externalStageId
        }));
    };

    const saveAllChanges = async () => {
        for (const [internalStageId, externalStageId] of Object.entries(pendingChanges)) {
            await saveMappingMutation.mutateAsync({
                internalStageId,
                externalStageId: externalStageId || null
            });
        }
        setPendingChanges({});
    };

    const hasChanges = Object.keys(pendingChanges).length > 0;
    const isLoading = stagesLoading || externalLoading || mappingsLoading;

    // Group stages by phase
    const stagesByPhase = welcomeStages?.reduce((acc, stage) => {
        const phaseLabel = (stage.phase as any)?.label || 'Sem Fase';
        if (!acc[phaseLabel]) {
            acc[phaseLabel] = {
                color: (stage.phase as any)?.color || '#888',
                stages: []
            };
        }
        acc[phaseLabel].stages.push(stage);
        return acc;
    }, {} as Record<string, { color: string; stages: WelcomeStage[] }>);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ArrowUpRight className="w-5 h-5" />
                            Saída: Etapas (Welcome → Active)
                        </CardTitle>
                        <CardDescription>
                            Configure como as etapas do Welcome mapeiam para etapas no ActiveCampaign.
                            Mudanças de etapa serão sincronizadas automaticamente.
                        </CardDescription>
                    </div>
                    {hasChanges && (
                        <Button
                            onClick={saveAllChanges}
                            disabled={saveMappingMutation.isPending}
                        >
                            {saveMappingMutation.isPending ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4 mr-2" />
                            )}
                            Salvar
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {stagesByPhase && Object.entries(stagesByPhase).map(([phaseName, { color, stages }]) => (
                        <div key={phaseName} className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: color }}
                                />
                                <h3 className="font-medium text-sm">{phaseName}</h3>
                                <Badge variant="outline" className="text-xs">
                                    {stages.length} etapas
                                </Badge>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                                                Etapa Welcome
                                            </th>
                                            <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">
                                                → Etapa Active
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stages.map((stage) => {
                                            const currentExternalId = getMappingForStage(stage.id);
                                            const hasChange = pendingChanges[stage.id] !== undefined;

                                            return (
                                                <tr
                                                    key={stage.id}
                                                    className={cn(
                                                        "transition-colors",
                                                        hasChange && "bg-yellow-500/5"
                                                    )}
                                                >
                                                    <td className="px-4 py-2">
                                                        <span className="text-sm font-medium">
                                                            {stage.nome}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <select
                                                            className="w-full px-3 py-1.5 border border-input rounded-md bg-background text-sm"
                                                            value={currentExternalId || ''}
                                                            onChange={(e) => handleExternalStageChange(stage.id, e.target.value)}
                                                        >
                                                            <option value="">Não sincronizar</option>
                                                            {externalStages?.map((ext) => (
                                                                <option key={ext.external_id} value={ext.external_id}>
                                                                    {ext.external_name || ext.external_id}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Warning */}
                    <div className="p-4 bg-amber-500/5 border border-amber-200/50 rounded-lg">
                        <h4 className="font-medium text-sm text-amber-700 mb-1">
                            ⚠️ Importante
                        </h4>
                        <p className="text-xs text-amber-600/80">
                            Apenas cards com <code className="px-1 bg-amber-100 rounded">external_id</code> (sincronizados do Active)
                            terão suas mudanças de etapa refletidas de volta. Cards criados internamente não são afetados.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
