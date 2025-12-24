import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/Select";
import { toast } from 'sonner';
import {
    Plus,
    Trash2,
    Eye,
    EyeOff,
    Loader2,
    Save
} from 'lucide-react';

export default function CategoryManagement() {
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);

    // New Category State
    const [newScope, setNewScope] = useState('change_request');
    const [newKey, setNewKey] = useState('');
    const [newLabel, setNewLabel] = useState('');

    // Fetch Categories
    const { data: categories, isLoading } = useQuery({
        queryKey: ['activity-categories'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activity_categories')
                .select('*')
                .order('scope')
                .order('label');
            if (error) throw error;
            return data;
        }
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            // Auto-generate key if empty
            const key = newKey || newLabel.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

            const { error } = await supabase
                .from('activity_categories')
                .insert([{
                    scope: newScope,
                    key: key,
                    label: newLabel,
                    visible: true
                }]);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Categoria criada!");
            setIsCreating(false);
            setNewKey('');
            setNewLabel('');
            queryClient.invalidateQueries({ queryKey: ['activity-categories'] });
        },
        onError: (error: any) => {
            toast.error(`Erro ao criar: ${error.message}`);
        }
    });

    // Toggle Visibility Mutation
    const toggleVisibilityMutation = useMutation({
        mutationFn: async ({ id, visible }: { id: string, visible: boolean }) => {
            const { error } = await supabase
                .from('activity_categories')
                .update({ visible })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Visibilidade atualizada!");
            queryClient.invalidateQueries({ queryKey: ['activity-categories'] });
        },
        onError: (error: any) => {
            toast.error(`Erro ao atualizar: ${error.message}`);
        }
    });

    // Delete Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from('activity_categories')
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Categoria removida!");
            queryClient.invalidateQueries({ queryKey: ['activity-categories'] });
        },
        onError: (error: any) => {
            toast.error(`Erro ao remover: ${error.message}`);
        }
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLabel) return;
        createMutation.mutate();
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciar Categorias</h1>
                    <p className="text-gray-500">Configure as opções disponíveis nos formulários de atividades.</p>
                </div>
                <Button onClick={() => setIsCreating(true)} className="gap-2">
                    <Plus className="w-4 h-4" /> Nova Categoria
                </Button>
            </div>

            {isCreating && (
                <div className="mb-8 p-6 bg-white rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4">
                    <h3 className="font-medium text-gray-900 mb-4">Nova Categoria</h3>
                    <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-4 items-end">
                        <div className="grid gap-2">
                            <Label>Escopo</Label>
                            <Select
                                value={newScope}
                                onChange={setNewScope}
                                options={[
                                    { value: 'change_request', label: 'Solicitação de Mudança' }
                                ]}
                            />
                        </div>
                        <div className="grid gap-2 sm:col-span-2">
                            <Label>Nome (Label)</Label>
                            <Input
                                value={newLabel}
                                onChange={e => setNewLabel(e.target.value)}
                                placeholder="Ex: Upgrade de Quarto"
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" disabled={createMutation.isPending} className="flex-1">
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-medium text-gray-500">Escopo</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Nome</th>
                            <th className="px-6 py-3 font-medium text-gray-500">Chave (Key)</th>
                            <th className="px-6 py-3 font-medium text-gray-500 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {categories?.map((cat) => (
                            <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-3 text-gray-500 font-mono text-xs uppercase">{cat.scope}</td>
                                <td className="px-6 py-3 font-medium text-gray-900">{cat.label}</td>
                                <td className="px-6 py-3 text-gray-400 font-mono text-xs">{cat.key}</td>
                                <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleVisibilityMutation.mutate({ id: cat.id, visible: !cat.visible })}
                                        className={cat.visible ? "text-green-600 hover:text-green-700 hover:bg-green-50" : "text-gray-400 hover:text-gray-600"}
                                        title={cat.visible ? "Visível" : "Oculto"}
                                    >
                                        {cat.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            if (confirm('Tem certeza? Isso pode afetar registros existentes.')) {
                                                deleteMutation.mutate(cat.id);
                                            }
                                        }}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </td>
                            </tr>
                        ))}
                        {categories?.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    Nenhuma categoria encontrada.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
