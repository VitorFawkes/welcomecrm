import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../ui/dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Label } from '../../ui/label';
import { useToast } from '../../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { Copy, Check, UserPlus, Link as LinkIcon, Loader2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext'; // Added useAuth

interface Team {
    id: string;
    name: string;
}

interface AddUserModalProps {
    teams: Team[];
    onSuccess: () => void;
}

const ROLES = [
    { value: 'admin', label: 'Administrador' },
    { value: 'gestor', label: 'Gestor' },
    { value: 'vendas', label: 'Vendas' },
    { value: 'sdr', label: 'SDR' },
    { value: 'pos_venda', label: 'Pós-Venda' },
    { value: 'concierge', label: 'Concierge' },
    { value: 'financeiro', label: 'Financeiro' }
] as const;

type UserRole = typeof ROLES[number]['value'];

export function AddUserModal({ teams, onSuccess }: AddUserModalProps) {
    const { user } = useAuth(); // Added useAuth hook
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole | ''>('');
    const [inviteTeam, setInviteTeam] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    const handleGenerateInvite = async () => {
        if (!inviteEmail || !inviteRole) {
            toast({ title: 'Erro', description: 'Preencha email e papel.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            if (!user) throw new Error('No user');

            const { data: token, error } = await supabase.rpc('generate_invite', {
                p_email: inviteEmail,
                p_role: inviteRole as any,
                p_team_id: (inviteTeam || null) as any,
                p_created_by: user.id
            });

            if (error) throw error;

            const link = `${window.location.origin}/invite/${token}`;
            setGeneratedLink(link);
            toast({ title: 'Convite gerado!', description: 'Copie o link abaixo.', type: 'success' });
            onSuccess();
        } catch (error: unknown) {
            console.error(error);
            const message = error instanceof Error ? error.message : 'Falha ao gerar convite.';
            toast({ title: 'Erro', description: message, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Adicionar Usuário
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Convidar Novo Usuário</DialogTitle>
                    <DialogDescription>
                        Envie um link de convite para o novo membro do time.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Email do Convidado</Label>
                        <Input
                            placeholder="joao@exemplo.com"
                            value={inviteEmail}
                            onChange={e => setInviteEmail(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Papel (Role)</Label>
                            <Select
                                value={inviteRole}
                                onChange={(val) => setInviteRole(val as UserRole)}
                                options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Time (Opcional)</Label>
                            <Select
                                value={inviteTeam}
                                onChange={setInviteTeam}
                                options={[
                                    { value: '', label: 'Sem Time' },
                                    ...teams.map(t => ({ value: t.id, label: t.name }))
                                ]}
                            />
                        </div>
                    </div>

                    {generatedLink ? (
                        <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                            <Label className="text-green-800 mb-2 block">Link de Convite Gerado:</Label>
                            <div className="flex gap-2">
                                <Input value={generatedLink} readOnly className="bg-white" />
                                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-green-600 mt-2">
                                Este link expira em 7 dias e só pode ser usado uma vez.
                            </p>
                        </div>
                    ) : (
                        <Button onClick={handleGenerateInvite} disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                            Gerar Link de Convite
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
