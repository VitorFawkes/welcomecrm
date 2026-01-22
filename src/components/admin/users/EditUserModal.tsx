import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Label } from '../../ui/label';
import { useToast } from '../../../contexts/ToastContext';
import { Shield, Users } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../../ui/dialog';
import { useRoles } from '../../../hooks/useRoles';
import { useTeamOptions } from '../../../hooks/useTeams';
import type { Database } from '../../../database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface EditUserModalProps {
    user: Profile | null;
    isOpen: boolean;
    onClose: () => void;
    teams?: any[]; // Legacy prop, now using useTeamOptions
    onSuccess?: () => void;
}

export function EditUserModal({ user, isOpen, onClose, onSuccess }: EditUserModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isLoading, setIsLoading] = useState(false);

    // Fetch roles and teams from database
    const { roles, isLoading: rolesLoading } = useRoles();
    const { options: teamOptions, isLoading: teamsLoading } = useTeamOptions(true);

    // Form State
    const [formData, setFormData] = useState({
        nome: '',
        email: '',
        role_id: '',
        team_id: 'none'
    });

    // Load user data when modal opens
    useEffect(() => {
        if (user) {
            setFormData({
                nome: user.nome || '',
                email: user.email || '',
                role_id: (user as any).role_id || '',
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
                role_id: formData.role_id || null,
                team_id: formData.team_id === 'none' ? null : formData.team_id
            });
        } finally {
            setIsLoading(false);
        }
    };

    const roleOptions = roles.map(r => ({
        value: r.id,
        label: r.display_name
    }));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[550px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    {/* Basic Info Section */}
                    <div className="space-y-4">
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

                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email (Não editável)</Label>
                            <Input
                                id="edit-email"
                                value={formData.email}
                                disabled
                                className="bg-muted text-muted-foreground cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* Access Control Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Shield className="w-4 h-4 text-primary" />
                            Controle de Acesso
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role (Nível de Acesso)</Label>
                            <Select
                                value={formData.role_id}
                                onChange={(value) => setFormData({ ...formData, role_id: value })}
                                options={roleOptions}
                                disabled={rolesLoading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Define o que o usuário pode fazer no sistema (permissões).
                            </p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-slate-200" />

                    {/* Team Assignment Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Users className="w-4 h-4 text-primary" />
                            Organização
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-team">Time / Squad</Label>
                            <Select
                                value={formData.team_id}
                                onChange={(value) => setFormData({ ...formData, team_id: value })}
                                options={teamOptions}
                                disabled={teamsLoading}
                            />
                            <p className="text-xs text-muted-foreground">
                                Define a qual equipe o usuário pertence (organização).
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
