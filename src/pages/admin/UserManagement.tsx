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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../contexts/ToastContext';
import { Loader2, Search, Edit2, Trash2, Shield, Users, FileText, Mail, Key, Briefcase } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { AddUserModal } from '../../components/admin/users/AddUserModal';
import { EditUserModal } from '../../components/admin/users/EditUserModal';
import InviteManager from '../../components/admin/users/InviteManager';
import AuditLogViewer from '../../components/admin/audit/AuditLogViewer';
import { RoleManagement } from '../../components/admin/roles/RoleManagement';
import { TeamManagement } from '../../components/admin/teams/TeamManagement';
import { useRoles } from '../../hooks/useRoles';
import { useUsers } from '../../hooks/useUsers';

export default function UserManagement() {
    const { profile } = useAuth();
    const { toast } = useToast();
    const { users, isLoading: loading, refetch: refetchUsers, toggleUserStatus, deleteUser } = useUsers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [teams, setTeams] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<string | null>(null);

    // Get roles for display
    const { roles } = useRoles();

    useEffect(() => {
        fetchTeams();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
            await toggleUserStatus.mutateAsync({ userId, currentStatus });
            toast({ title: 'Sucesso', description: 'Status do usuário atualizado.', type: 'success' });
        } catch (error) {
            console.error('Error toggling status:', error);
            toast({ title: 'Erro', description: 'Falha ao atualizar status.', type: 'error' });
        }
    };

    const handleDeleteUser = async (userId: string) => {
        try {
            await deleteUser.mutateAsync(userId);
            toast({ title: 'Sucesso', description: 'Usuário excluído com sucesso.', type: 'success' });
            setUserToDelete(null);
        } catch (error) {
            console.error('Error deleting user:', error);
            toast({ title: 'Erro', description: 'Falha ao excluir usuário.', type: 'error' });
        }
    };

    const filteredUsers = users.filter(user =>
        user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Helper to get role display name
    const getRoleDisplay = (user: any) => {
        // First try new role_id
        if (user.role_id) {
            const role = roles.find(r => r.id === user.role_id);
            if (role) return { name: role.display_name, color: role.color };
        }
        // Fallback to legacy role enum
        if (user.role) {
            return { name: user.role, color: 'bg-gray-100 text-gray-800' };
        }
        return { name: '-', color: 'bg-gray-100 text-gray-800' };
    };

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
                <h2 className="text-2xl font-bold text-foreground">Gestão de Equipe</h2>
                <p className="text-muted-foreground">Gerencie usuários, roles, convites e auditoria.</p>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-5 lg:w-[800px] mb-8">
                    <TabsTrigger value="users" className="gap-2">
                        <Users className="w-4 h-4" />
                        Usuários
                    </TabsTrigger>
                    <TabsTrigger value="roles" className="gap-2">
                        <Key className="w-4 h-4" />
                        Roles
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="gap-2">
                        <Briefcase className="w-4 h-4" />
                        Times
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
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar usuários..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <AddUserModal teams={teams} onSuccess={refetchUsers} />
                    </div>

                    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
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
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredUsers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Nenhum usuário encontrado.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredUsers.map(user => (
                                        <TableRow key={user.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">{user.nome}</span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {(() => {
                                                    const roleInfo = getRoleDisplay(user);
                                                    return (
                                                        <Badge className={roleInfo.color}>
                                                            {roleInfo.name}
                                                        </Badge>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {user.teams?.name || '-'}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={user.active ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/20'}
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
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleToggleStatus(user.id, user.active)}
                                                        className={user.active ? 'text-orange-500 hover:text-orange-600 hover:bg-orange-50' : 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50'}
                                                        title={user.active ? 'Desativar Usuário' : 'Ativar Usuário'}
                                                    >
                                                        {user.active ? <Shield className="w-4 h-4" /> : <Shield className="w-4 h-4 fill-current" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setUserToDelete(user.id)}
                                                        className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                                        title="Excluir Usuário"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
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

                <TabsContent value="roles" className="animate-in fade-in-50 duration-500">
                    <RoleManagement />
                </TabsContent>

                <TabsContent value="teams" className="animate-in fade-in-50 duration-500">
                    <TeamManagement />
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
                onSuccess={refetchUsers}
            />

            <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita e removerá o acesso ao sistema.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => userToDelete && handleDeleteUser(userToDelete)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
