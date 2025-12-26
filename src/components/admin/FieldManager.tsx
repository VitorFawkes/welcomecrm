import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useToast } from '../../contexts/ToastContext';

interface SystemField {
    key: string;
    label: string;
    type: string;
    active: boolean;
    created_at?: string;
}

export default function FieldManager() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [newField, setNewField] = useState({ key: '', label: '', type: 'text' });

    // Fetch fields
    const { data: fields, isLoading } = useQuery({
        queryKey: ['system-fields-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_fields')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data as SystemField[];
        }
    });

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
            queryClient.invalidateQueries({ queryKey: ['system-fields'] }); // Update global cache
            toast({ title: 'Status atualizado', type: 'success' });
        },
        onError: (err) => {
            toast({ title: 'Erro ao atualizar', description: err.message, type: 'error' });
        }
    });

    // Add Field Mutation
    const addFieldMutation = useMutation({
        mutationFn: async (field: { key: string, label: string, type: string }) => {
            // Auto-generate key if empty or sanitize it
            const sanitizedKey = field.key.toLowerCase().replace(/[^a-z0-9_]/g, '_');

            const { error } = await supabase
                .from('system_fields')
                .insert({
                    key: sanitizedKey,
                    label: field.label,
                    type: field.type,
                    active: true
                });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['system-fields-admin'] });
            queryClient.invalidateQueries({ queryKey: ['system-fields'] });
            toast({ title: 'Campo criado com sucesso', type: 'success' });
            setIsAdding(false);
            setNewField({ key: '', label: '', type: 'text' });
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
        // Generate key from label if key is empty
        const keyToSave = newField.key || newField.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "_");

        addFieldMutation.mutate({ ...newField, key: keyToSave });
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                <div>
                    <h3 className="font-semibold text-gray-900">Campos do Sistema</h3>
                    <p className="text-sm text-gray-500">Gerencie os campos disponíveis para os cards.</p>
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
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="text-xs font-medium text-gray-500 mb-1 block">Nome do Campo (Label)</label>
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
                                    options={[
                                        { value: 'text', label: 'Texto Curto' },
                                        { value: 'textarea', label: 'Texto Longo' },
                                        { value: 'date', label: 'Data' },
                                        { value: 'currency', label: 'Moeda' },
                                        { value: 'select', label: 'Seleção Única' },
                                        { value: 'multiselect', label: 'Múltipla Escolha' },
                                        { value: 'boolean', label: 'Sim/Não' }
                                    ]}
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
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">Carregando...</td></tr>
                            ) : fields?.map(field => (
                                <tr key={field.key} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{field.label}</div>
                                        <div className="text-xs text-gray-400 font-mono">{field.key}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs">
                                            {field.type}
                                        </span>
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
                                            {field.active ? 'Visível' : 'Oculto'}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                if (confirm('Tem certeza? Isso pode quebrar dados existentes se houver registros usando este campo.')) {
                                                    deleteFieldMutation.mutate(field.key)
                                                }
                                            }}
                                            className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
