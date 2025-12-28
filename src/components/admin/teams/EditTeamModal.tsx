import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Label } from '../../ui/label';
import { useToast } from '../../../contexts/ToastContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '../../ui/dialog';
import type { Database } from '../../../database.types';

type Team = Database['public']['Tables']['teams']['Row'];
type Department = Database['public']['Tables']['departments']['Row'];

interface EditTeamModalProps {
    team: Team | null;
    isOpen: boolean;
    onClose: () => void;
    departments: Department[];
}

export function EditTeamModal({ team, isOpen, onClose, departments }: EditTeamModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        department_id: '',
        description: ''
    });

    useEffect(() => {
        if (team) {
            setFormData({
                name: team.name,
                department_id: team.department_id || '',
                description: team.description || ''
            });
        }
    }, [team]);

    const updateTeamMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase
                .from('teams')
                .update({
                    name: formData.name,
                    description: formData.description,
                    department_id: formData.department_id
                })
                .eq('id', team?.id || '');

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            toast({
                title: 'Time atualizado',
                description: 'As alterações foram salvas com sucesso.',
                type: 'success'
            });
            onClose();
        },
        onError: (error: any) => {
            toast({
                title: 'Erro ao atualizar',
                description: error.message || 'Ocorreu um erro ao salvar as alterações.',
                type: 'error'
            });
        }
    });

    const handleDelete = async () => {
        if (!team) return;
        if (!confirm('Tem certeza que deseja excluir este time? Esta ação não pode ser desfeita e pode afetar usuários associados.')) return;

        setIsLoading(true);
        try {
            const { error } = await supabase.from('teams').delete().eq('id', team.id);
            if (error) throw error;

            queryClient.invalidateQueries({ queryKey: ['teams'] });
            toast({
                title: 'Time excluído',
                description: 'O time foi removido com sucesso.',
                type: 'success'
            });
            onClose();
        } catch (error: any) {
            toast({
                title: 'Erro ao excluir',
                description: error.message || 'Não foi possível excluir o time.',
                type: 'error'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!team) return;

        setIsLoading(true);
        try {
            await updateTeamMutation.mutateAsync();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Time</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do time ou altere seu departamento.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-team-name">Nome do Time</Label>
                            <Input
                                id="edit-team-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Squad Alpha"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-department">Departamento (Macro Área)</Label>
                            <Select
                                value={formData.department_id}
                                onChange={(value) => setFormData({ ...formData, department_id: value })}
                                options={departments.map(d => ({ value: d.id, label: d.name }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Descrição</Label>
                            <Input
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Breve descrição do propósito deste time"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex justify-between sm:justify-between">
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isLoading}
                        >
                            Excluir Time
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
