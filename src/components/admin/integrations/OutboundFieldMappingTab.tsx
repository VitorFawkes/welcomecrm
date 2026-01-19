import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { toast } from 'sonner';
import { Check, RefreshCw, Settings, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemField {
    key: string;
    label: string;
    type: string;
    section: string;
    is_system: boolean;
    active: boolean;
}

interface ExternalField {
    external_id: string;
    external_name: string;
    metadata: Record<string, unknown>;
}

interface OutboundFieldMap {
    id: string;
    integration_id: string;
    internal_field: string;
    internal_field_label: string | null;
    external_field_id: string;
    external_field_name: string | null;
    sync_always: boolean;
    section?: string | null;
    is_active: boolean;
}

interface StageFieldConfig {
    stage_id: string;
    field_key: string;
    is_visible: boolean;
}

interface OutboundFieldMappingTabProps {
    integrationId: string;
}

// Section labels for display
const SECTION_LABELS: Record<string, string> = {
    trip_info: '✈️ Informações da Viagem',
    people: '👥 Pessoas',
    observacoes_criticas: '⚠️ Observações Críticas',
    pos_venda: '📦 Pós-Venda',
    marketing: '📊 Marketing',
    financial: '💳 Financeiro',
    system: '⚙️ Sistema',
    header: '📋 Cabeçalho',
    details: '📝 Detalhes',
};

export function OutboundFieldMappingTab({ integrationId }: OutboundFieldMappingTabProps) {
    const queryClient = useQueryClient();
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['trip_info', 'observacoes_criticas']));
    const [syncingAC, setSyncingAC] = useState(false);

    // 1. Fetch system_fields (SINGLE SOURCE OF TRUTH for CRM fields)
    const { data: systemFields = [], isLoading: loadingFields } = useQuery({
        queryKey: ['system-fields-for-mapping'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_fields')
                .select('key, label, type, section, is_system, active')
                .eq('active', true)
                .order('section')
                .order('label');
            if (error) throw error;
            return data as SystemField[];
        }
    });

    // 2. Fetch external AC fields from integration_catalog
    const { data: externalFields = [], isLoading: loadingExternal } = useQuery({
        queryKey: ['ac-fields-catalog', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name, metadata')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'field')
                .order('external_name');
            if (error) throw error;
            return data as ExternalField[];
        }
    });

    // 3. Fetch existing mappings
    const { data: existingMappings = [], isLoading: loadingMappings } = useQuery({
        queryKey: ['outbound-field-mappings', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_outbound_field_map')
                .select('*')
                .eq('integration_id', integrationId);
            if (error) throw error;
            return data as OutboundFieldMap[];
        }
    });

    // 4. Fetch stage visibility (to show which phases use each field)
    const { data: stageConfigs = [] } = useQuery({
        queryKey: ['stage-field-configs-visibility'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stage_field_config')
                .select('stage_id, field_key, is_visible')
                .eq('is_visible', true);
            if (error) throw error;
            return data as StageFieldConfig[];
        }
    });

    // Group fields by section
    const fieldsBySection = useMemo(() => {
        const grouped: Record<string, SystemField[]> = {};
        systemFields.forEach(field => {
            const section = field.section || 'details';
            if (!grouped[section]) grouped[section] = [];
            grouped[section].push(field);
        });
        return grouped;
    }, [systemFields]);

    // Create lookup for existing mappings
    const mappingByField = useMemo(() => {
        const lookup: Record<string, OutboundFieldMap> = {};
        existingMappings.forEach(m => {
            lookup[m.internal_field] = m;
        });
        return lookup;
    }, [existingMappings]);

    // Count visible stages per field
    const visibleStagesPerField = useMemo(() => {
        const count: Record<string, number> = {};
        stageConfigs.forEach(sc => {
            count[sc.field_key] = (count[sc.field_key] || 0) + 1;
        });
        return count;
    }, [stageConfigs]);

    // Upsert mapping mutation
    const upsertMapping = useMutation({
        mutationFn: async ({ fieldKey, externalFieldId, section }: { fieldKey: string; externalFieldId: string | null; section: string }) => {
            const fieldMeta = systemFields.find(f => f.key === fieldKey);
            const externalMeta = externalFields.find(f => f.external_id === externalFieldId);

            if (!externalFieldId) {
                // Remove mapping
                const { error } = await supabase
                    .from('integration_outbound_field_map')
                    .delete()
                    .eq('integration_id', integrationId)
                    .eq('internal_field', fieldKey);
                if (error) throw error;
            } else {
                // Upsert mapping
                const { error } = await supabase
                    .from('integration_outbound_field_map')
                    .upsert({
                        integration_id: integrationId,
                        internal_field: fieldKey,
                        internal_field_label: fieldMeta?.label || null,
                        external_field_id: externalFieldId,
                        external_field_name: externalMeta?.external_name || null,
                        section: section,
                        sync_always: false,
                        is_active: true
                    }, { onConflict: 'integration_id,internal_field' });
                if (error) throw error;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outbound-field-mappings'] });
        },
        onError: (e) => toast.error(`Erro: ${e.message}`)
    });

    // Toggle sync_always mutation
    const toggleSyncAlways = useMutation({
        mutationFn: async ({ id, syncAlways }: { id: string; syncAlways: boolean }) => {
            const { error } = await supabase
                .from('integration_outbound_field_map')
                .update({ sync_always: syncAlways })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outbound-field-mappings'] });
        }
    });

    // Sync AC fields
    const handleSyncACFields = async () => {
        setSyncingAC(true);
        try {
            const { data, error } = await supabase.functions.invoke('integration-sync-catalog', {
                body: { integration_id: integrationId }
            });
            if (error) throw error;

            toast.success(`Sincronizado: ${data.fields_synced || 0} campos do ActiveCampaign`);
            queryClient.invalidateQueries({ queryKey: ['ac-fields-catalog'] });
        } catch (e: any) {
            toast.error(`Erro ao sincronizar: ${e.message}`);
        } finally {
            setSyncingAC(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    };

    const isLoading = loadingFields || loadingExternal || loadingMappings;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const sections = Object.keys(fieldsBySection).sort();

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5" />
                                Mapeamento de Campos (Welcome → ActiveCampaign)
                            </CardTitle>
                            <CardDescription>
                                Configure quais campos do CRM sincronizam para o ActiveCampaign.
                                Campos são agrupados por seção conforme configuração do sistema.
                            </CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={handleSyncACFields}
                                disabled={syncingAC}
                            >
                                {syncingAC ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                )}
                                Sincronizar Campos AC
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{systemFields.length}</div>
                    <div className="text-xs text-muted-foreground">Campos CRM</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold">{externalFields.length}</div>
                    <div className="text-xs text-muted-foreground">Campos AC</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{existingMappings.length}</div>
                    <div className="text-xs text-muted-foreground">Mapeados</div>
                </div>
            </div>

            {/* Sections */}
            {sections.map(section => {
                const fields = fieldsBySection[section];
                const isExpanded = expandedSections.has(section);
                const mappedCount = fields.filter(f => mappingByField[f.key]).length;

                return (
                    <Card key={section} className="overflow-hidden">
                        <CardHeader
                            className="cursor-pointer hover:bg-muted/30 transition-colors"
                            onClick={() => toggleSection(section)}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {isExpanded ? (
                                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                    )}
                                    <CardTitle className="text-base">
                                        {SECTION_LABELS[section] || section}
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs">
                                        {fields.length} campos
                                    </Badge>
                                    {mappedCount > 0 && (
                                        <Badge variant="default" className="text-xs bg-green-600">
                                            {mappedCount} mapeados
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </CardHeader>

                        {isExpanded && (
                            <CardContent className="pt-0">
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-muted/50">
                                            <tr>
                                                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-1/3">
                                                    Campo CRM
                                                </th>
                                                <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-1/3">
                                                    → Campo ActiveCampaign
                                                </th>
                                                <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground w-20">
                                                    Modo
                                                </th>
                                                <th className="text-center px-4 py-2 text-xs font-medium text-muted-foreground w-20">
                                                    Fases
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {fields.map(field => {
                                                const mapping = mappingByField[field.key];
                                                const visibleStages = visibleStagesPerField[field.key] || 0;

                                                return (
                                                    <tr key={field.key} className={cn(
                                                        "transition-colors",
                                                        mapping && "bg-green-50/50"
                                                    )}>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium">
                                                                    {field.label}
                                                                </span>
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({field.key})
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Select
                                                                value={mapping?.external_field_id || ''}
                                                                onChange={(val) => upsertMapping.mutate({
                                                                    fieldKey: field.key,
                                                                    externalFieldId: val || null,
                                                                    section: section
                                                                })}
                                                                options={[
                                                                    { value: '', label: 'Não mapeado' },
                                                                    ...externalFields.map(ef => ({
                                                                        value: ef.external_id,
                                                                        label: ef.external_name || ef.external_id
                                                                    }))
                                                                ]}
                                                                placeholder="Selecione..."
                                                                className="w-full"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {mapping ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className={cn(
                                                                        "text-xs h-7",
                                                                        mapping.sync_always
                                                                            ? "text-green-600"
                                                                            : "text-muted-foreground"
                                                                    )}
                                                                    onClick={() => toggleSyncAlways.mutate({
                                                                        id: mapping.id,
                                                                        syncAlways: !mapping.sync_always
                                                                    })}
                                                                >
                                                                    {mapping.sync_always ? (
                                                                        <><Check className="w-3 h-3 mr-1" />Sempre</>
                                                                    ) : (
                                                                        'Na fase'
                                                                    )}
                                                                </Button>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">-</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {visibleStages > 0 ? (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {visibleStages}
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="text-xs opacity-50">
                                                                    0
                                                                </Badge>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                );
            })}

            {/* Info */}
            <Card className="bg-blue-50/50 border-blue-200">
                <CardContent className="py-4">
                    <h4 className="font-medium text-sm text-blue-700 mb-2">
                        💡 Como funciona
                    </h4>
                    <ul className="text-xs text-blue-600/80 space-y-1">
                        <li><strong>Campos CRM:</strong> Lidos automaticamente de <code>system_fields</code> - sempre atualizados</li>
                        <li><strong>Campos AC:</strong> Sincronizados via botão ou automaticamente do ActiveCampaign</li>
                        <li><strong>Modo "Na fase":</strong> Sincroniza apenas se o campo está visível na fase atual do card</li>
                        <li><strong>Modo "Sempre":</strong> Sincroniza independentemente da fase</li>
                        <li><strong>Fases:</strong> Número de etapas onde o campo está visível</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
