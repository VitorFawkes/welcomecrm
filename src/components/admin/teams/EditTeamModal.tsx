import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTeams, type UpdateTeamData, type Team } from '../../../hooks/useTeams';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Textarea } from '../../ui/textarea';
import { Loader2 } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';

interface EditTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    team: Team | null;
}

// TEAM_COLORS array is removed as the color selection mechanism changes to a color input.

export function EditTeamModal({ isOpen, onClose, team }: EditTeamModalProps) {
    const { updateTeam } = useTeams(); // Assuming updateTeam is an object with mutateAsync and isPending
    const { toast } = useToast(); // Re-adding useToast hook
    const { register, handleSubmit, reset, formState: { errors } } = useForm<UpdateTeamData>();

    useEffect(() => {
        if (team && isOpen) { // Added isOpen check for reset logic
            reset({
                name: team.name,
                description: team.description || '',
                color: team.color || '#000000', // Default color if not set
                is_active: team.is_active
            });
        }
    }, [team, isOpen, reset]); // Added isOpen to dependency array

    const onSubmit = async (data: UpdateTeamData) => {
        if (!team) return;
        try {
            // Assuming updateTeam.mutateAsync expects { id, ...data }
            await updateTeam.mutateAsync({ ...data, id: team.id });
            toast({ title: 'Sucesso', description: 'Time atualizado com sucesso!', type: 'success' });
            onClose();
        } catch (error) {
            console.error('Error updating team:', error);
            toast({ title: 'Erro', description: 'Erro ao atualizar time.', type: 'error' });
        }
    };

    if (!team) return null; // Keep this check

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]"> {/* Adjusted max-width */}
                <DialogHeader>
                    <DialogTitle>Editar Time</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4"> {/* Adjusted spacing */}
                    <div className="space-y-2"> {/* Adjusted spacing */}
                        <label className="text-sm font-medium">Nome do Time</label>
                        <Input
                            {...register('name', { required: 'Nome é obrigatório' })}
                            placeholder="Ex: Comercial, Marketing"
                        />
                        {errors.name && (
                            <span className="text-xs text-red-500">{errors.name.message}</span>
                        )}
                    </div>

                    <div className="space-y-2"> {/* Adjusted spacing */}
                        <label className="text-sm font-medium">Descrição</label>
                        <Textarea
                            {...register('description')}
                            placeholder="Descrição das responsabilidades do time"
                        />
                    </div>

                    <div className="space-y-2"> {/* New color selection div */}
                        <label className="text-sm font-medium">Cor</label>
                        <div className="flex gap-2">
                            <Input
                                type="color"
                                {...register('color')}
                                className="w-12 h-10 p-1 cursor-pointer"
                            />
                            <Input
                                {...register('color')}
                                placeholder="#000000"
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            {...register('is_active')}
                            id="is_active"
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="is_active" className="text-sm font-medium">
                            Time Ativo
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4"> {/* Adjusted spacing and variant */}
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={updateTeam.isPending}> {/* Changed isUpdating to updateTeam.isPending */}
                            {updateTeam.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                'Salvar Alterações'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
