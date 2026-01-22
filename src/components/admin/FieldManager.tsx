import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Eye, EyeOff, Save, Filter } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import { FIELD_TYPES } from '../../constants/admin';
import { useSections } from '../../hooks/useSections';

interface SystemField {
    key: string;
    label: string;
    type: string;
    section: string | null;
    active: boolean;
    is_system: boolean;
    created_at?: string;
}



export default function FieldManager() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [filterSection, setFilterSection] = useState('');

    // Fetch sections dynamically from DB (replaces hardcoded SECTIONS)
    const { data: sections = [], isLoading: loadingSections } = useSections();

    // Derived section options for Select components
    const sectionFilterOptions = [
        { value: '', label: 'Todas as Seções' },
        ...sections.map(s => ({ value: s.key, label: s.label }))
    ];
    const sectionSelectOptions = sections.map(s => ({ value: s.key, label: s.label }));

    // Default to first section for new fields
    const defaultSection = sections[0]?.key || 'trip_info';
    const [newField, setNewField] = useState({ key: '', label: '', type: 'text', section: defaultSection });

    // Fetch fields
    const { data: fields, isLoading } = useQuery({
        queryKey: ['system-fields-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_fields')
                .select('*')
                .order('section')
                .order('label');
            if (error) throw error;
            return data as SystemField[];
        }
    });

    // Filter fields by section
    const filteredFields = useMemo(() => {
        if (!fields) return [];
        if (!filterSection) return fields;
        return fields.filter(f => f.section === filterSection);
    }, [fields, filterSection]);

    // Toggle Active Mutation
    const toggleActiveMutation = useMutation({
        mutationFn: async ({ key, active }: { key: string, active: boolean }) => {
            const { error } = await supabase
                .from('system_fields')
                .update({ active })
                .eq('key', key);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-admin'] });
            queryClient.invalidateQueries({ queryKey: ['system-fields'] });
            toast({ title: 'Status atualizado', type: 'success' });
        },
        onError: (err) => {
            toast({ title: 'Erro ao atualizar', description: err.message, type: 'error' });
        }
    });

    // Update Section Mutation
    const updateSectionMutation = useMutation({
        mutationFn: async ({ key, section }: { key: string, section: string }) => {
            const { error } = await supabase
                .from('system_fields')
                .update({ section })
                .eq('key', key);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-admin'] });
            queryClient.invalidateQueries({ queryKey: ['system-fields'] });
            toast({ title: 'Seção atualizada', type: 'success' });
        },
        onError: (err) => {
            toast({ title: 'Erro ao atualizar seção', description: err.message, type: 'error' });
        }
    });

    // Add Field Mutation
    const addFieldMutation = useMutation({
        mutationFn: async (field: { key: string, label: string, type: string, section: string }) => {
            const sanitizedKey = field.key.toLowerCase().replace(/[^a-z0-9_]/g, '_');

            const { error } = await supabase
                .from('system_fields')
                .insert({
                    key: sanitizedKey,
                    label: field.label,
                    type: field.type,
                    section: field.section,
                    active: true
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-admin'] });
            queryClient.invalidateQueries({ queryKey: ['system-fields'] });
            toast({ title: 'Campo criado com sucesso', type: 'success' });
            setIsAdding(false);
            setNewField({ key: '', label: '', type: 'text', section: defaultSection });
        },
        onError: (err) => {
            toast({ title: 'Erro ao criar campo', description: err.message, type: 'error' });
        }
    });

    // Delete Field Mutation
    const deleteFieldMutation = useMutation({
        mutationFn: async (key: string) => {
            const { error } = await supabase
                .from('system_fields')
                .delete()
                .eq('key', key);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-admin'] });
            queryClient.invalidateQueries({ queryKey: ['system-fields'] });
            toast({ title: 'Campo excluído', type: 'success' });
        },
        onError: () => {
            toast({ title: 'Erro ao excluir', description: 'Verifique se o campo não está em uso.', type: 'error' });
        }
    });

    const handleSaveNew = () => {
        if (!newField.label) {
            toast({ title: 'Label é obrigatório', type: 'error' });
            return;
        }
        const keyToSave = newField.key || newField.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_");
        addFieldMutation.mutate({ ...newField, key: keyToSave });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Cadastro de Campos</h1>
                <p className="text-sm text-gray-500 mt-1">Gerencie todos os campos disponíveis no sistema.</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Filter className="w-4 h-4 text-gray-400" />
                        <div className="w-56">
                            <Select
                                value={filterSection}
                                onChange={setFilterSection}
                                options={sectionFilterOptions}
                            />
                        </div>
                        <span className="text-sm text-gray-500">
                            {filteredFields.length} campo{filteredFields.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <Button onClick={() => setIsAdding(true)} disabled={isAdding} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Novo Campo
                    </Button>
                </div>

                <div className="p-4">
                    {isAdding && (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-medium text-gray-900 mb-3">Novo Campo</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Nome do Campo</label>
                                    <Input
                                        value={newField.label}
                                        onChange={e => setNewField({ ...newField, label: e.target.value })}
                                        placeholder="Ex: Data de Retorno"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo</label>
                                    <Select
                                        value={newField.type}
                                        onChange={val => setNewField({ ...newField, type: val })}
                                        options={FIELD_TYPES.map(t => ({ value: t.value, label: t.label }))}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Seção</label>
                                    <Select
                                        value={newField.section}
                                        onChange={val => setNewField({ ...newField, section: val })}
                                        options={sectionSelectOptions}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Chave (Opcional)</label>
                                    <Input
                                        value={newField.key}
                                        onChange={e => setNewField({ ...newField, key: e.target.value })}
                                        placeholder="Ex: data_retorno"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancelar</Button>
                                <Button onClick={handleSaveNew} disabled={addFieldMutation.isPending}>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar Campo
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg border border-gray-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Nome / Chave</th>
                                    <th className="px-4 py-3">Tipo</th>
                                    <th className="px-4 py-3">Seção</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {(isLoading || loadingSections) ? (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
                                ) : filteredFields.length === 0 ? (
                                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum campo encontrado.</td></tr>
                                ) : filteredFields.map(field => (
                                    <tr key={field.key} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-900">{field.label}</div>
                                            <div className="text-xs text-gray-400 font-mono">{field.key}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs">
                                                {FIELD_TYPES.find(t => t.value === field.type)?.label || field.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Select
                                                value={field.section || ''}
                                                onChange={val => updateSectionMutation.mutate({ key: field.key, section: val })}
                                                options={sectionSelectOptions}
                                                className="w-40"
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <button
                                                onClick={() => toggleActiveMutation.mutate({ key: field.key, active: !field.active })}
                                                className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${field.active
                                                    ? 'bg-green-50 text-green-700 hover:bg-green-100'
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {field.active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                                {field.active ? 'Ativo' : 'Inativo'}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {!field.is_system && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        if (confirm('Tem certeza? Isso pode quebrar dados existentes.')) {
                                                            deleteFieldMutation.mutate(field.key)
                                                        }
                                                    }}
                                                    className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {field.is_system && (
                                                <Badge variant="outline" className="text-xs">Sistema</Badge>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
