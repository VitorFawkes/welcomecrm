import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'sonner';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Check, RefreshCw, Plus, Trash2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FieldCatalogItem {
    field_key: string;
    field_name: string;
    field_type: string;
    is_required: boolean;
}

interface OutboundFieldMap {
    id: string;
    integration_id: string;
    internal_field: string;
    internal_field_label: string | null;
    external_field_id: string;
    external_field_name: string | null;
    sync_always: boolean;
    sync_on_phases: string[];
    is_active: boolean;
}

interface OutboundFieldMappingTabProps {
    integrationId: string;
}

export function OutboundFieldMappingTab({ integrationId }: OutboundFieldMappingTabProps) {
    const queryClient = useQueryClient();
    const [newMapping, setNewMapping] = useState<{
        internal_field: string;
        external_field_id: string;
    } | null>(null);

    // Fetch internal field catalog
    const { data: internalFields, isLoading: internalLoading } = useQuery({
        queryKey: ['internal-field-catalog', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_field_catalog' as never)
                .select('field_key, field_name, field_type, is_required')
                .eq('integration_id', integrationId)
                .eq('direction', 'outbound')
                .order('field_name');
            if (error) throw error;
            return data as unknown as FieldCatalogItem[];
        }
    });

    // Fetch external fields from catalog
    const { data: externalFields, isLoading: externalLoading } = useQuery({
        queryKey: ['external-field-catalog', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'field');
            if (error) throw error;
            return data as { external_id: string; external_name: string }[];
        }
    });

    // Fetch existing outbound field mappings
    const { data: existingMappings, isLoading: mappingsLoading } = useQuery({
        queryKey: ['outbound-field-mappings', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_outbound_field_map' as never)
                .select('*')
                .eq('integration_id', integrationId)
                .order('internal_field');
            if (error) throw error;
            return data as unknown as OutboundFieldMap[];
        }
    });

    // Add mapping mutation
    const addMappingMutation = useMutation({
        mutationFn: async ({ internalField, externalFieldId }: { internalField: string, externalFieldId: string }) => {
            const internalMeta = internalFields?.find(f => f.field_key === internalField);
            const externalMeta = externalFields?.find(f => f.external_id === externalFieldId);

            const { error } = await (supabase
                .from('integration_outbound_field_map' as never)
                .upsert as Function)({
                    integration_id: integrationId,
                    internal_field: internalField,
                    internal_field_label: internalMeta?.field_name || null,
                    external_field_id: externalFieldId,
                    external_field_name: externalMeta?.external_name || null,
                    sync_always: false,
                    is_active: true
                }, {
                    onConflict: 'integration_id,internal_field'
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outbound-field-mappings'] });
            toast.success('Mapeamento adicionado');
            setNewMapping(null);
        },
        onError: (e) => toast.error(`Erro: ${e.message}`)
    });

    // Toggle sync_always mutation
    const toggleSyncAlwaysMutation = useMutation({
        mutationFn: async ({ id, syncAlways }: { id: string, syncAlways: boolean }) => {
            const { error } = await (supabase
                .from('integration_outbound_field_map' as never)
                .update as Function)({ sync_always: syncAlways })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outbound-field-mappings'] });
        }
    });

    // Delete mapping mutation
    const deleteMappingMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase
                .from('integration_outbound_field_map' as never)
                .delete as Function)()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['outbound-field-mappings'] });
            toast.success('Mapeamento removido');
        },
        onError: (e) => toast.error(`Erro: ${e.message}`)
    });

    const isLoading = internalLoading || externalLoading || mappingsLoading;

    // Get unmapped internal fields
    const mappedInternalFields = new Set(existingMappings?.map(m => m.internal_field) || []);
    const unmappedFields = internalFields?.filter(f => !mappedInternalFields.has(f.field_key)) || [];

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
                            <Settings className="w-5 h-5" />
                            Saída: Campos (Welcome → Active)
                        </CardTitle>
                        <CardDescription>
                            Configure quais campos do Welcome sincronizam para campos no ActiveCampaign.
                            Campos marcados como "Sempre" sincronizam independente da fase.
                        </CardDescription>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => setNewMapping({ internal_field: '', external_field_id: '' })}
                        disabled={unmappedFields.length === 0}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Existing Mappings */}
                    <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                                        Campo Welcome
                                    </th>
                                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                                        → Campo Active
                                    </th>
                                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">
                                        Sincronizar
                                    </th>
                                    <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground w-16">

                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {existingMappings?.map((mapping) => (
                                    <tr key={mapping.id}>
                                        <td className="px-4 py-3">
                                            <div>
                                                <span className="text-sm font-medium">
                                                    {mapping.internal_field_label || mapping.internal_field}
                                                </span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    ({mapping.internal_field})
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm">
                                                {mapping.external_field_name || mapping.external_field_id}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className={cn(
                                                    "text-xs",
                                                    mapping.sync_always
                                                        ? "text-green-600 hover:text-green-700"
                                                        : "text-muted-foreground hover:text-foreground"
                                                )}
                                                onClick={() => toggleSyncAlwaysMutation.mutate({
                                                    id: mapping.id,
                                                    syncAlways: !mapping.sync_always
                                                })}
                                            >
                                                {mapping.sync_always ? (
                                                    <>
                                                        <Check className="w-3 h-3 mr-1" />
                                                        Sempre
                                                    </>
                                                ) : (
                                                    'Na fase'
                                                )}
                                            </Button>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-500/10"
                                                onClick={() => deleteMappingMutation.mutate(mapping.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}

                                {existingMappings?.length === 0 && !newMapping && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                            Nenhum mapeamento configurado. Clique em "Adicionar" para começar.
                                        </td>
                                    </tr>
                                )}

                                {/* New Mapping Row */}
                                {newMapping && (
                                    <tr className="bg-green-500/5">
                                        <td className="px-4 py-3">
                                            <select
                                                className="w-full px-3 py-1.5 border border-input rounded-md bg-background text-sm"
                                                value={newMapping.internal_field}
                                                onChange={(e) => setNewMapping({ ...newMapping, internal_field: e.target.value })}
                                            >
                                                <option value="">Selecione um campo</option>
                                                {unmappedFields.map((field) => (
                                                    <option key={field.field_key} value={field.field_key}>
                                                        {field.field_name}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="w-full px-3 py-1.5 border border-input rounded-md bg-background text-sm"
                                                value={newMapping.external_field_id}
                                                onChange={(e) => setNewMapping({ ...newMapping, external_field_id: e.target.value })}
                                            >
                                                <option value="">Selecione um campo Active</option>
                                                {externalFields?.map((field) => (
                                                    <option key={field.external_id} value={field.external_id}>
                                                        {field.external_name || field.external_id}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <Badge variant="outline" className="text-xs">Na fase</Badge>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex gap-1 justify-center">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-green-600"
                                                    disabled={!newMapping.internal_field || !newMapping.external_field_id}
                                                    onClick={() => addMappingMutation.mutate({
                                                        internalField: newMapping.internal_field,
                                                        externalFieldId: newMapping.external_field_id
                                                    })}
                                                >
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => setNewMapping(null)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Info */}
                    <div className="p-4 bg-blue-500/5 border border-blue-200/50 rounded-lg">
                        <h4 className="font-medium text-sm text-blue-700 mb-2">
                            Modos de Sincronização
                        </h4>
                        <ul className="text-xs text-blue-600/80 space-y-1">
                            <li><strong>Na fase:</strong> Sincroniza apenas se o campo está visível na fase atual do card (usa pipeline_card_settings)</li>
                            <li><strong>Sempre:</strong> Sincroniza independentemente da fase</li>
                        </ul>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
