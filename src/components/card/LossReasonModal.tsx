import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/Select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useFieldConfig } from '@/hooks/useFieldConfig';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LossReasonModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (motivoId: string, comentario: string) => void;
    targetStageId: string;
    targetStageName: string;
}

export default function LossReasonModal({
    isOpen,
    onClose,
    onConfirm,
    targetStageId,
    targetStageName
}: LossReasonModalProps) {
    const [motivoId, setMotivoId] = useState('');
    const [comentario, setComentario] = useState('');
    const [error, setError] = useState<string | null>(null);

    // 1. Get Governance Rules for this stage
    const { getFieldConfig } = useFieldConfig();

    // Check requirements
    const motivoConfig = getFieldConfig(targetStageId, 'motivo_perda_id');
    const comentarioConfig = getFieldConfig(targetStageId, 'motivo_perda_comentario');

    const isMotivoRequired = motivoConfig?.isRequired ?? false; // Default false if not configured
    const isComentarioRequired = comentarioConfig?.isRequired ?? false;

    // 2. Fetch Active Loss Reasons
    const { data: reasons, isLoading } = useQuery({
        queryKey: ['loss-reasons-active'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('motivos_perda')
                .select('id, nome')
                .eq('ativo', true)
                .order('nome');
            if (error) throw error;
            return data;
        },
        enabled: isOpen
    });

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setMotivoId('');
            setComentario('');
            setError(null);
        }
    }, [isOpen]);

    const handleConfirm = () => {
        setError(null);

        // Validation
        if (isMotivoRequired && !motivoId) {
            setError('Por favor, selecione um motivo de perda.');
            return;
        }

        if (isComentarioRequired && !comentario.trim()) {
            setError('Por favor, adicione um comentário justificando a perda.');
            return;
        }

        onConfirm(motivoId, comentario);
    };

    const reasonOptions = reasons?.map(r => ({ value: r.id, label: r.nome })) || [];

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertTriangle className="w-5 h-5" />
                        Negócio Perdido
                    </DialogTitle>
                    <DialogDescription>
                        Você está movendo este card para <strong>{targetStageName}</strong>.
                        Por favor, informe o motivo da perda para nossos relatórios.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-md border border-red-100 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {/* Motivo Selector */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            Motivo Principal
                            {isMotivoRequired && <span className="text-red-500">*</span>}
                        </Label>
                        {isLoading ? (
                            <div className="h-10 w-full bg-slate-100 animate-pulse rounded-md" />
                        ) : (
                            <Select
                                value={motivoId}
                                onChange={setMotivoId}
                                options={[
                                    { value: '', label: 'Selecione um motivo...' },
                                    ...reasonOptions
                                ]}
                                className={cn(
                                    "w-full",
                                    error && !motivoId && isMotivoRequired && "border-red-300 ring-red-100"
                                )}
                            />
                        )}
                    </div>

                    {/* Comentario Textarea */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                            Comentário / Detalhes
                            {isComentarioRequired && <span className="text-red-500">*</span>}
                        </Label>
                        <Textarea
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            placeholder="Descreva o que aconteceu..."
                            className={cn(
                                "min-h-[100px]",
                                error && !comentario.trim() && isComentarioRequired && "border-red-300 ring-red-100"
                            )}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        className="bg-red-600 hover:bg-red-700 text-white border-transparent"
                    >
                        Confirmar Perda
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
