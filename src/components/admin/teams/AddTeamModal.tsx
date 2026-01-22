import { useForm } from 'react-hook-form';
import { useTeams, type CreateTeamData } from '../../../hooks/useTeams';
import { useToast } from '../../../contexts/ToastContext';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/textarea';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface AddTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function AddTeamModal({ isOpen, onClose }: AddTeamModalProps) {
    const { createTeam } = useTeams();
    const { toast } = useToast();
    const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateTeamData>();

    const onSubmit = async (data: CreateTeamData) => {
        try {
            await createTeam.mutateAsync(data);
            toast({ title: 'Sucesso', description: 'Time criado com sucesso!', type: 'success' });
            reset();
            onClose();
        } catch (error) {
            console.error('Error creating team:', error);
            toast({ title: 'Erro', description: 'Erro ao criar time. Tente novamente.', type: 'error' });
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criar Novo Time</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Nome do Time</label>
                        <Input
                            {...register('name', { required: 'Nome é obrigatório' })}
                            placeholder="Ex: Comercial, Marketing"
                        />
                        {errors.name && (
                            <span className="text-xs text-red-500">{errors.name.message}</span>
                        )}
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Descrição</label>
                        <Textarea
                            {...register('description')}
                            placeholder="Descrição das responsabilidades do time"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Cor</label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                {...register('color')}
                                className="w-12 h-10 p-1 cursor-pointer"
                                defaultValue="#3b82f6"
                            />
                            <Input
                                {...register('color')}
                                placeholder="#000000"
                                className="flex-1"
                                defaultValue="#3b82f6"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={createTeam.isPending}>
                            {createTeam.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Time'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
