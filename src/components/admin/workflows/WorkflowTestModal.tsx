import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { WorkflowService } from '@/services/WorkflowService';
import { toast } from 'sonner';
import { Play, Loader2, CheckCircle } from 'lucide-react';

interface WorkflowTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    workflowId: string;
}

export function WorkflowTestModal({ isOpen, onClose, workflowId }: WorkflowTestModalProps) {
    const [cardId, setCardId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    const handleRunTest = async () => {
        if (!cardId) {
            toast.error('Por favor, insira o ID do Card para teste.');
            return;
        }

        setIsLoading(true);
        setTestResult(null);

        try {
            const result = await WorkflowService.triggerTestWorkflow(workflowId, cardId);
            setTestResult(result);
            toast.success('Teste iniciado com sucesso!');
        } catch (error) {
            console.error('Erro ao iniciar teste:', error);
            toast.error('Falha ao iniciar teste.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Testar Workflow (Dry Run)</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="cardId">ID do Card para Teste</Label>
                        <Input
                            id="cardId"
                            placeholder="UUID do Card"
                            value={cardId}
                            onChange={(e) => setCardId(e.target.value)}
                        />
                        <p className="text-sm text-muted-foreground">
                            O workflow será executado em modo de simulação. Nenhuma alteração real será feita no banco de dados.
                        </p>
                    </div>

                    {testResult && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex items-center gap-2 mb-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="font-medium text-sm">Teste Iniciado</span>
                            </div>
                            <pre className="text-xs overflow-auto max-h-[200px] p-2 bg-white rounded border border-slate-100">
                                {JSON.stringify(testResult, null, 2)}
                            </pre>
                            <p className="text-xs text-muted-foreground mt-2">
                                Verifique o log de execução para detalhes passo-a-passo.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button onClick={handleRunTest} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Executando...
                            </>
                        ) : (
                            <>
                                <Play className="w-4 h-4 mr-2" />
                                Executar Teste
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
