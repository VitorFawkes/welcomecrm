import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../ui/tabs';
import { Button } from '../../ui/Button';
import { Input } from '../../ui/Input';
import { Select } from '../../ui/Select';
import { Label } from '../../ui/label';
import { useToast } from '../../../contexts/ToastContext';
import { supabase } from '../../../lib/supabase';
import { Copy, Check, UserPlus, Link as LinkIcon, Loader2 } from 'lucide-react';
import { ROLES } from '../../../constants/admin';

interface Team {
    id: string;
    name: string;
    department_id: string;
}

interface AddUserModalProps {
    teams: Team[];
    onUserCreated: () => void;
}

export function AddUserModal({ teams, onUserCreated }: AddUserModalProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('invite');

    // Invite State
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('');
    const [inviteTeam, setInviteTeam] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [copied, setCopied] = useState(false);

    // Manual State
    const [manualName, setManualName] = useState('');
    const [manualEmail, setManualEmail] = useState('');
    const [manualPassword, setManualPassword] = useState('');
    const [manualRole, setManualRole] = useState('');
    const [manualTeam, setManualTeam] = useState('');

    const handleGenerateInvite = async () => {
        if (!inviteEmail || !inviteRole) {
            toast({ title: 'Erro', description: 'Preencha email e papel.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user');

            const { data: token, error } = await supabase.rpc('generate_invite' as any, {
                p_email: inviteEmail,
                p_role: inviteRole,
                p_team_id: inviteTeam || null,
                p_created_by: user.id
            });

            if (error) throw error;

            // Construct link (assuming current origin)
            const link = `${window.location.origin}/invite/${token}`;
            setGeneratedLink(link);
            toast({ title: 'Convite gerado!', description: 'Copie o link abaixo.', type: 'success' });
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Erro', description: error.message || 'Falha ao gerar convite.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleManualCreate = async () => {
        if (!manualEmail || !manualPassword || !manualRole) {
            toast({ title: 'Erro', description: 'Preencha os campos obrigatórios.', type: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-user', {
                body: {
                    email: manualEmail,
                    password: manualPassword,
                    role: manualRole,
                    team_id: manualTeam || null
                }
            });

            if (error) throw error;
            if (data.error) throw new Error(data.error);

            toast({ title: 'Sucesso', description: 'Usuário criado com sucesso.', type: 'success' });
            setIsOpen(false);
            onUserCreated();
            // Reset form
            setManualEmail('');
            setManualPassword('');
            setManualName('');
        } catch (error: any) {
            console.error(error);
            toast({ title: 'Erro', description: error.message || 'Falha ao criar usuário.', type: 'error' });
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
                    <DialogTitle>Adicionar Novo Usuário</DialogTitle>
                    <DialogDescription>
                        Escolha como deseja adicionar o usuário ao sistema.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 mb-4">
                        <TabsTrigger value="invite">Convite (Link)</TabsTrigger>
                        <TabsTrigger value="manual">Criação Manual</TabsTrigger>
                    </TabsList>

                    <TabsContent value="invite" className="space-y-4">
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
                                    onChange={setInviteRole}
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
                    </TabsContent>

                    <TabsContent value="manual" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nome Completo</Label>
                            <Input
                                placeholder="João Silva"
                                value={manualName}
                                onChange={e => setManualName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                placeholder="joao@exemplo.com"
                                value={manualEmail}
                                onChange={e => setManualEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Senha Inicial</Label>
                            <Input
                                type="password"
                                placeholder="******"
                                value={manualPassword}
                                onChange={e => setManualPassword(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Papel (Role)</Label>
                                <Select
                                    value={manualRole}
                                    onChange={setManualRole}
                                    options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Time (Opcional)</Label>
                                <Select
                                    value={manualTeam}
                                    onChange={setManualTeam}
                                    options={[
                                        { value: '', label: 'Sem Time' },
                                        ...teams.map(t => ({ value: t.id, label: t.name }))
                                    ]}
                                />
                            </div>
                        </div>
                        <Button onClick={handleManualCreate} disabled={isLoading} className="w-full">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                            Criar Usuário Manualmente
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
