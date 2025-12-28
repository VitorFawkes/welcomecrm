import { useState } from 'react';
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
    DialogTrigger,
    DialogDescription
} from '../../ui/dialog';
import { Plus } from 'lucide-react';
import type { Database } from '../../../database.types';

type Department = Database['public']['Tables']['departments']['Row'];

interface AddTeamModalProps {
    departments: Department[];
}

export function AddTeamModal({ departments }: AddTeamModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        department_id: '',
        description: ''
    });

    const createTeamMutation = useMutation({
        mutationFn: async (newTeam: any) => {
            const { error } = await supabase
                .from('teams')
                .insert(newTeam);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            toast({
                title: 'Time criado',
                description: 'O time foi criado com sucesso.',
                type: 'success'
            });
            setIsOpen(false);
            setFormData({ name: '', department_id: '', description: '' });
        },
        onError: (error: any) => {
            toast({
                title: 'Erro ao criar time',
                description: error.message || 'Ocorreu um erro ao criar o time.',
                type: 'error'
            });
        }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.department_id) {
            toast({
                title: 'Campos obrigatórios',
                description: 'Por favor, preencha o nome e o departamento.',
                type: 'error'
            });
            return;
        }

        setIsLoading(true);
        try {
            await createTeamMutation.mutateAsync({
                name: formData.name,
                department_id: formData.department_id,
                description: formData.description || null
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo Time
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Criar Novo Time</DialogTitle>
                    <DialogDescription>
                        Crie um novo time e associe-o a um departamento (Macro Área).
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="team-name">Nome do Time</Label>
                            <Input
                                id="team-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Squad Alpha"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="department">Departamento (Macro Área)</Label>
                            <Select
                                value={formData.department_id}
                                onChange={(value) => setFormData({ ...formData, department_id: value })}
                                options={departments.map(d => ({ value: d.id, label: d.name }))}
                                placeholder="Selecione um departamento..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Descrição (Opcional)</Label>
                            <Input
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Breve descrição do propósito deste time"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Criando...' : 'Criar Time'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
