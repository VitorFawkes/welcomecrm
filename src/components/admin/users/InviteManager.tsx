import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../../ui/Table';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Loader2, Trash2, RefreshCw, Copy, Check } from 'lucide-react';
import { useToast } from '../../../contexts/ToastContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Invite {
    id: string;
    email: string;
    role: string;
    token: string;
    created_at: string;
    expires_at: string;
    used_at: string | null;
    created_by: string;
}

export default function InviteManager() {
    const { toast } = useToast();
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);



    const fetchInvites = useCallback(async () => {
        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase as any)
                .from('invitations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setInvites((data as unknown as Invite[]) || []);
        } catch (error) {
            console.error('Error fetching invites:', error);
            toast({ title: 'Erro', description: 'Falha ao carregar convites.', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInvites();
    }, [fetchInvites]);

    const handleRevoke = async (id: string) => {
        if (!confirm('Tem certeza que deseja revogar este convite?')) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any)
                .from('invitations')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast({ title: 'Sucesso', description: 'Convite revogado.', type: 'success' });
            fetchInvites();
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao revogar convite.', type: 'error' });
        }
    };

    const copyLink = (token: string, id: string) => {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Convites Pendentes</h3>
                <Button variant="outline" size="sm" onClick={fetchInvites}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Atualizar
                </Button>
            </div>

            <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Papel</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Expira em</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                                </TableCell>
                            </TableRow>
                        ) : invites.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                    Nenhum convite encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            invites.map(invite => {
                                const isExpired = new Date(invite.expires_at) < new Date();
                                const isUsed = !!invite.used_at;

                                return (
                                    <TableRow key={invite.id}>
                                        <TableCell className="font-medium text-gray-900">
                                            {invite.email}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize">
                                                {invite.role}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {format(new Date(invite.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell className="text-gray-500">
                                            {format(new Date(invite.expires_at), "dd/MM/yy", { locale: ptBR })}
                                        </TableCell>
                                        <TableCell>
                                            {isUsed ? (
                                                <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Aceito</Badge>
                                            ) : isExpired ? (
                                                <Badge variant="destructive">Expirado</Badge>
                                            ) : (
                                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pendente</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {!isUsed && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => copyLink(invite.token, invite.id)}
                                                        title="Copiar Link"
                                                    >
                                                        {copiedId === invite.id ? (
                                                            <Check className="w-4 h-4 text-green-600" />
                                                        ) : (
                                                            <Copy className="w-4 h-4 text-gray-500" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRevoke(invite.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        title="Revogar"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
