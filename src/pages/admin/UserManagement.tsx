import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import { Loader2, Search, Edit2, Trash2, Shield, Users, FileText, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AddUserModal } from '../../components/admin/users/AddUserModal';
import { EditUserModal } from '../../components/admin/users/EditUserModal';
import InviteManager from '../../components/admin/users/InviteManager';
import AuditLogViewer from '../../components/admin/audit/AuditLogViewer';

export default function UserManagement() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    useEffect(() => {
        fetchUsers();
        fetchTeams();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    teams (
                        id,
                        name
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast({ title: 'Erro', description: 'Falha ao carregar usuários.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const fetchTeams = async () => {
        try {
            const { data, error } = await supabase.from('teams').select('*');
            if (error) throw error;
            setTeams(data || []);
        } catch (error) {
            console.error('Error fetching teams:', error);
        }
    };

    const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ active: !currentStatus })
                .eq('id', userId);

            if (error) throw error;

            setUsers(users.map(u =>
                u.id === userId ? { ...u, active: !currentStatus } : u
            ));

            toast({ title: 'Sucesso', description: 'Status do usuário atualizado.', type: 'success' });
        } catch (error) {
            toast({ title: 'Erro', description: 'Falha ao atualizar status.', type: 'error' });
        }
    };

    const filteredUsers = users.filter(user =>
        user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!profile?.is_admin && profile?.role !== 'admin') {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900">Acesso Restrito</h2>
                    <p className="text-gray-500">Você não tem permissão para acessar esta página.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Gestão de Equipe</h2>
                <p className="text-gray-500">Gerencie usuários, convites e auditoria.</p>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px] mb-8">
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" />
                        Usuários Ativos
                    </TabsTrigger>
                    <TabsTrigger value="invites" className="gap-2">
                        <Mail className="w-4 h-4" />
                        Convites
                    </TabsTrigger>
                    <TabsTrigger value="audit" className="gap-2">
                        <FileText className="w-4 h-4" />
                        Auditoria
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4 animate-in fade-in-50 duration-500">
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar usuários..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <AddUserModal teams={teams} onSuccess={fetchUsers} />
                    </div>

                    <div className="bg-white rounded-md border border-gray-200 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Usuário</TableHead>
                                    <TableHead>Papel</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                                            Nenhum usuário encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{user.nome}</span>
                                                    <span className="text-xs text-gray-500">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="capitalize">
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.teams?.name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={user.active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}
                                                >
                                                    {user.active ? 'Ativo' : 'Inativo'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setSelectedUser(user);
                                                            setIsEditModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleToggleStatus(user.id, user.active)}
                                                        className={user.active ? 'text-red-500 hover:text-red-700 hover:bg-red-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}
                                                    >
                                                        {user.active ? <Trash2 className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </TabsContent>

                <TabsContent value="invites" className="animate-in fade-in-50 duration-500">
                    <InviteManager />
                </TabsContent>

                <TabsContent value="audit" className="animate-in fade-in-50 duration-500">
                    <AuditLogViewer />
                </TabsContent>
            </Tabs>

            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                user={selectedUser}
                teams={teams}
                onSuccess={fetchUsers}
            />
        </div>
    );
}
