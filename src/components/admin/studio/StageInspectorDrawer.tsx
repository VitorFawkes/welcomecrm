import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { X, Save, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { Database } from '../../../database.types';

type PipelineStage = Database['public']['Tables']['pipeline_stages']['Row'];
type SystemField = Database['public']['Tables']['system_fields']['Row'];
type StageFieldConfig = Database['public']['Tables']['stage_field_config']['Row'];

interface StageInspectorDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    stage: PipelineStage | null;
}

export default function StageInspectorDrawer({ isOpen, onClose, stage }: StageInspectorDrawerProps) {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'general' | 'data'>('general');

    // Local state for stage details
    const [formData, setFormData] = useState<Partial<PipelineStage>>({});

    useEffect(() => {
        if (stage) {
            setFormData(stage);
        }
    }, [stage]);

    // --- Data Fetching ---
    const { data: fields } = useQuery({
        queryKey: ['system-fields-inspector'],
        queryFn: async () => {
            const { data } = await supabase.from('system_fields').select('*').order('label');
            return data as SystemField[];
        },
        enabled: isOpen
    });

    const { data: configs } = useQuery({
        queryKey: ['stage-configs-inspector', stage?.id],
        queryFn: async () => {
            if (!stage) return [];
            const { data } = await supabase.from('stage_field_config').select('*').eq('stage_id', stage.id);
            return data as StageFieldConfig[];
        },
        enabled: isOpen && !!stage
    });

    // --- Mutations ---
    const updateStageMutation = useMutation({
        mutationFn: async (data: Partial<PipelineStage>) => {
            if (!stage) return;
            const { error } = await supabase.from('pipeline_stages').update(data).eq('id', stage.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline-stages'] });
            alert('Etapa atualizada com sucesso!');
        }
    });

    const upsertConfigMutation = useMutation({
        mutationFn: async (newConfig: Partial<StageFieldConfig>) => {
            const { error } = await supabase
                .from('stage_field_config')
                .upsert(newConfig as any, { onConflict: 'stage_id, field_key' });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stage-configs-inspector', stage?.id] });
            queryClient.invalidateQueries({ queryKey: ['stage-field-configs-unified'] }); // Sync Matrix
        }
    });

    // --- Helpers ---
    const getConfig = (fieldKey: string) => {
        return configs?.find(c => c.field_key === fieldKey);
    };

    const handleToggle = (fieldKey: string, type: 'visible' | 'required' | 'header') => {
        if (!stage) return;
        const current = getConfig(fieldKey);

        const nextValue = {
            stage_id: stage.id,
            field_key: fieldKey,
            is_visible: current?.is_visible ?? true,
            is_required: current?.is_required ?? false,
            show_in_header: current?.show_in_header ?? false
        };

        if (type === 'visible') nextValue.is_visible = !nextValue.is_visible;
        if (type === 'required') nextValue.is_required = !nextValue.is_required;
        if (type === 'header') nextValue.show_in_header = !nextValue.show_in_header;

        upsertConfigMutation.mutate(nextValue);
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="fixed inset-y-0 right-0 w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col">
                {/* Header */}
                <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 bg-gray-50/50">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Editar Etapa: {stage?.nome}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 px-6">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={cn(
                            "py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'general' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('data')}
                        className={cn(
                            "py-3 px-4 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'data' ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
                        )}
                    >
                        Coleta de Dados
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'general' ? (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Etapa</label>
                                <input
                                    type="text"
                                    value={formData.nome || ''}
                                    onChange={e => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fase (Macro-Etapa)</label>
                                <select
                                    value={formData.fase || 'SDR'}
                                    onChange={e => setFormData({ ...formData, fase: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="SDR">SDR (Pré-Venda)</option>
                                    <option value="Planner">Planner (Venda)</option>
                                    <option value="Pós-venda">Pós-Venda</option>
                                </select>
                            </div>

                            <button
                                onClick={() => updateStageMutation.mutate(formData)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Save className="w-4 h-4" />
                                Salvar Alterações
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-500 mb-4">
                                Defina quais campos devem ser preenchidos nesta etapa.
                                <br />
                                <span className="text-xs italic">Alterações são salvas automaticamente.</span>
                            </p>

                            {fields?.map(field => {
                                const config = getConfig(field.key);
                                const isVisible = config?.is_visible ?? true;
                                const isRequired = config?.is_required ?? false;

                                return (
                                    <div key={field.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{field.label}</p>
                                            <p className="text-xs text-gray-400">{field.section}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleToggle(field.key, 'visible')}
                                                className={cn(
                                                    "p-1.5 rounded transition-colors",
                                                    isVisible ? "text-blue-600 bg-blue-50" : "text-gray-300 hover:bg-gray-200"
                                                )}
                                                title="Visível"
                                            >
                                                {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => handleToggle(field.key, 'required')}
                                                className={cn(
                                                    "p-1.5 rounded transition-colors",
                                                    isRequired ? "text-red-600 bg-red-50" : "text-gray-300 hover:bg-gray-200"
                                                )}
                                                title="Obrigatório"
                                            >
                                                {isRequired ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
