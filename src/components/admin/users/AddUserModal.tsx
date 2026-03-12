import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../../ui/dialog';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Label } from '../../ui/label';
import { useToast } from '../../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { Copy, Check, UserPlus, Link as LinkIcon, Loader2, Layers } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRoles } from '../../../hooks/useRoles';
import { useProducts } from '../../../hooks/useProducts';
import { cn } from '../../../lib/utils';

interface Team {
    id: string;
    name: string;
}

interface AddUserModalProps {
    teams: Team[];
    onSuccess: () => void;
}

export function AddUserModal({ teams, onSuccess }: AddUserModalProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const { roles, isLoading: rolesLoading } = useRoles();
    const { products: PRODUCTS } = useProducts(true);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('');
    const [inviteTeam, setInviteTeam] = useState('');
    const [inviteProdutos, setInviteProdutos] = useState<string[]>([]);
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    const toggleProduct = (value: string) => {
        setInviteProdutos(prev =>
            prev.includes(value) ? prev.filter(p => p !== value) : [...prev, value]
        );
    };

    const handleGenerateInvite = async () => {
        if (!inviteEmail || !inviteRole) {
            toast({ title: 'Erro', description: 'Preencha email e papel.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            if (!user) throw new Error('No user');

            // generate_invite tem p_produtos não refletido nos tipos gerados ainda
            type GenerateInviteRpc = (fn: string, params: Record<string, string | string[] | null>) => Promise<{ data: string | null; error: { message: string } | null }>;
            const { data: token, error } = await (supabase.rpc as unknown as GenerateInviteRpc)('generate_invite', {
                p_email: inviteEmail,
                p_role: inviteRole,
                p_team_id: inviteTeam || null,
                p_created_by: user.id,
                p_produtos: inviteProdutos.length > 0 ? inviteProdutos : null
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
                                onChange={(val) => setInviteRole(val)}
                                options={roles.map(r => ({ value: r.name, label: r.display_name }))}
                                disabled={rolesLoading}
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

                    {/* Product Access */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Layers className="w-4 h-4 text-primary" />
                            Acesso a Produtos
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {PRODUCTS.map(p => (
                                <label
                                    key={p.slug}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 p-3 rounded-lg border cursor-pointer transition-colors',
                                        inviteProdutos.includes(p.slug)
                                            ? 'border-indigo-300 bg-indigo-50'
                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                    )}
                                >
                                    <input
                                        type="checkbox"
                                        checked={inviteProdutos.includes(p.slug)}
                                        onChange={() => toggleProduct(p.slug)}
                                        className="sr-only"
                                    />
                                    <p.icon className={cn('w-5 h-5', p.color_class)} />
                                    <span className="text-xs font-medium text-foreground">{p.slug}</span>
                                </label>
                            ))}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Nenhum selecionado = acesso a todos os produtos.
                        </p>
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
