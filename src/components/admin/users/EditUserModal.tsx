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
} from '../../ui/dialog';
import { ROLES } from '../../../constants/admin';
import type { Database } from '../../../database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface EditUserModalProps {
    user: Profile | null;
    isOpen: boolean;
    onClose: () => void;
    teams: Team[];
    onSuccess?: () => void;
}

export function EditUserModal({ user, isOpen, onClose, teams, onSuccess }: EditUserModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        role: 'vendas',
        produtos: [] as any[],
        team_id: 'none'
    });

    // Load user data when modal opens
    useEffect(() => {
        if (user) {
            setFormData({
                nome: user.nome || '',
                email: user.email || '',
                role: user.role || 'sdr',
                produtos: (user as any).produtos || [],
                team_id: (user as any).team_id || 'none'
            });
        }
    }, [user]);

    const updateMutation = useMutation({
        mutationFn: async (updates: any) => {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user?.id || '');

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            toast({
                title: 'Usuário atualizado',
                description: 'As informações foram salvas com sucesso.',
                type: 'success'
            });
            if (onSuccess) onSuccess();
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setIsLoading(true);
        try {
            await updateMutation.mutateAsync({
                nome: formData.nome,
                // Email is usually not editable directly in profiles without auth update,
                // but for display name/role/team it's fine.
                // We won't update email here to avoid auth sync issues for now.
                // If email should be updated, it needs to be added to the mutationFn and formData.
                role: formData.role,
                team_id: formData.team_id === 'none' ? null : formData.team_id
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Nome Completo</Label>
                            <Input
                                id="edit-name"
                                value={formData.nome}
                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                placeholder="Ex: João Silva"
                                required
                            />
                        </div>

                        {/* Email (Read Only) */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email (Não editável)</Label>
                            <Input
                                id="edit-email"
                                value={formData.email}
                                disabled
                                className="bg-muted text-muted-foreground cursor-not-allowed"
                            />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Função (Role)</Label>
                            <Select
                                value={formData.role}
                                onChange={(value) => setFormData({ ...formData, role: value })}
                                options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                            />
                        </div>

                        {/* Team */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-team">Time / Squad</Label>
                            <Select
                                value={formData.team_id}
                                onChange={(value) => setFormData({ ...formData, team_id: value })}
                                options={[
                                    { value: 'none', label: 'Sem Time Definido' },
                                    ...teams.map(t => ({ value: t.id, label: t.name }))
                                ]}
                            />
                            <p className="text-xs text-gray-500">
                                O departamento será ajustado automaticamente com base no time.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
