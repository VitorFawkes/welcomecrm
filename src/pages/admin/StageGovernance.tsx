import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../database.types';
import { Shield, Settings, Trash2, Plus, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';

type Stage = Database['public']['Tables']['pipeline_stages']['Row'];
type FieldSetting = Database['public']['Tables']['stage_fields_settings']['Row'];

const AVAILABLE_FIELDS = [
    { value: 'valor_estimado', label: 'Valor Estimado' },
    { value: 'data_viagem_inicio', label: 'Data Início Viagem' },
    { value: 'data_viagem_fim', label: 'Data Fim Viagem' },
    { value: 'prioridade', label: 'Prioridade' },
    { value: 'origem', label: 'Origem' },
    { value: 'destinos', label: 'Destinos' },
    { value: 'orcamento', label: 'Orçamento' },
    { value: 'motivo', label: 'Motivo da Viagem' },
    { value: 'epoca_viagem', label: 'Época da Viagem' },
    { value: 'pessoas', label: 'Viajantes' },
];

export default function StageGovernance() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { user } = useAuth();
    const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
    const [newFieldKey, setNewFieldKey] = useState('');

    // Check if admin
    const { data: currentProfile, isLoading: isLoadingProfile } = useQuery({
        queryKey: ['currentProfile'],
        queryFn: async () => {
            if (!user) return null;
            const { data } = await (supabase.from('profiles') as any).select('*').eq('id', user.id).single();
            return data;
        },
        enabled: !!user
    });

    // Fetch stages
    const { data: stages } = useQuery({
        queryKey: ['all-stages'],
        queryFn: async () => {
            const { data, error } = await (supabase.from('pipeline_stages') as any)
                .select('*, pipelines(nome)')
                .order('ordem');
            if (error) throw error;
            return data as (Stage & { pipelines: { nome: string } })[];
        },
        enabled: currentProfile?.role === 'admin'
    });

    // Fetch field settings for selected stage
    const { data: fieldSettings } = useQuery({
        queryKey: ['stage-field-settings', selectedStageId],
        queryFn: async () => {
            if (!selectedStageId) return [];
            const { data, error } = await supabase
                .from('stage_fields_settings')
                .select('*')
                .eq('stage_id', selectedStageId);
            if (error) throw error;
            return data as FieldSetting[];
        },
        enabled: !!selectedStageId
    });

    // Add field mutation
    const addFieldMutation = useMutation({
        mutationFn: async ({ stageId, fieldKey, label }: { stageId: string, fieldKey: string, label: string }) => {
            const { error } = await supabase.from('stage_fields_settings').insert({
                stage_id: stageId,
                field_key: fieldKey,
                label: label,
                required: true,
                updated_by: user?.id
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-field-settings', selectedStageId] });
            queryClient.invalidateQueries({ queryKey: ['stage-fields-settings'] });
            toast({ title: 'Campo adicionado', type: 'success' });
            setNewFieldKey('');
        },
        onError: () => {
            toast({ title: 'Erro ao adicionar campo', type: 'error' });
        }
    });

    // Delete field mutation
    const deleteFieldMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('stage_fields_settings').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-field-settings', selectedStageId] });
            queryClient.invalidateQueries({ queryKey: ['stage-fields-settings'] });
            toast({ title: 'Campo removido', type: 'success' });
        },
        onError: () => {
            toast({ title: 'Erro ao remover campo', type: 'error' });
        }
    });

    const handleAddField = () => {
        if (!selectedStageId || !newFieldKey) return;

        // Check if already exists
        if (fieldSettings?.some(f => f.field_key === newFieldKey)) {
            toast({ title: 'Campo já existe nesta etapa', type: 'error' });
            return;
        }

        const field = AVAILABLE_FIELDS.find(f => f.value === newFieldKey);
        if (!field) return;

        addFieldMutation.mutate({
            stageId: selectedStageId,
            fieldKey: field.value,
            label: field.label
        });
    };

    if (isLoadingProfile) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!currentProfile || currentProfile.role !== 'admin') {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
                <Shield className="w-16 h-16 mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                <p>Apenas administradores podem configurar governança.</p>
            </div>
        );
    }

    const selectedStage = stages?.find(s => s.id === selectedStageId);

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Settings className="w-6 h-6" />
                        Governança de Etapas
                    </h1>
                    <p className="text-gray-500 mt-1">Configure campos obrigatórios (Quality Gates) por etapa do funil.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stage Selector */}
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Etapas</h3>
                    <div className="space-y-2">
                        {stages?.map(stage => (
                            <button
                                key={stage.id}
                                onClick={() => setSelectedStageId(stage.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedStageId === stage.id
                                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                                    : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                            >
                                <div className="font-medium">{stage.nome}</div>
                                <div className="text-xs text-gray-400">{stage.pipelines?.nome}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Field Settings */}
                <div className="md:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                    {selectedStage ? (
                        <>
                            <h3 className="font-semibold text-gray-900 mb-4">
                                Campos Obrigatórios: {selectedStage.nome}
                            </h3>

                            {/* Current fields */}
                            <div className="space-y-2 mb-6">
                                {fieldSettings?.length === 0 && (
                                    <p className="text-gray-400 text-sm py-4">Nenhum campo obrigatório configurado.</p>
                                )}
                                {fieldSettings?.map(field => (
                                    <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-medium text-gray-700">{field.label}</span>
                                            <span className="text-xs text-gray-400">({field.field_key})</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteFieldMutation.mutate(field.id)}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            {/* Add new field */}
                            <div className="border-t border-gray-100 pt-4">
                                <h4 className="font-medium text-gray-700 mb-3">Adicionar Campo Obrigatório</h4>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Select
                                            value={newFieldKey}
                                            onChange={(value) => setNewFieldKey(value)}
                                            options={[
                                                { value: '', label: 'Selecione um campo...' },
                                                ...AVAILABLE_FIELDS
                                                    .filter(f => !fieldSettings?.some(fs => fs.field_key === f.value))
                                                    .map(f => ({ value: f.value, label: f.label }))
                                            ]}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleAddField}
                                        disabled={!newFieldKey || addFieldMutation.isPending}
                                        className="gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Adicionar
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>Selecione uma etapa para configurar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
