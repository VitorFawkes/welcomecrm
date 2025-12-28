import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../database.types';
import {
    Users,
    Search,
    Shield,
    UserCheck,
    UserX,
    ShieldAlert,
    Pencil,
    CheckSquare,
    ArrowRightLeft,
    X
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useToast } from '../../contexts/ToastContext';
import AdminPageHeader from '../../components/admin/ui/AdminPageHeader';
import { ROLES } from '../../constants/admin';
import { AddUserModal } from '../../components/admin/users/AddUserModal';
import { EditUserModal } from '../../components/admin/users/EditUserModal';
import { TeamManagement } from '../../components/admin/teams/TeamManagement';
import { BulkMoveModal } from '../../components/admin/users/BulkMoveModal';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

export default function UserManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
    const [activeTab, setActiveTab] = useState('users');

    // Selection State
    const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
    const [isBulkMoveModalOpen, setIsBulkMoveModalOpen] = useState(false);

    // Edit Modal State
    const [editingUser, setEditingUser] = useState<Profile | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Fetch Current User to check if Admin
    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await (supabase.from('profiles') as any).select('*').eq('id', user.id).single();
            return data;
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    // Fetch Teams
    const { data: teams } = useQuery({
        queryKey: ['teams'],
        queryFn: async () => {
            const { data, error } = await supabase.from('teams').select('*').order('name');
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    });

    // Fetch All Profiles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => {
            const { data, error } = await (supabase.from('profiles') as any)
                .select(`
                    *,
                    teams (
                        name
                    )
                `)
                .order('nome');

            if (error) throw error;
            return data as (Profile & { teams: { name: string } | null })[] | null;
        },
        enabled: !!currentUser && currentUser.role === 'admin' // Only fetch if admin
    });

    // Update Mutation
    const updateProfileMutation = useMutation({
        mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
            const { error } = await (supabase.from('profiles') as any)
                .update(updates)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['profiles'] });
            toast({
                title: 'Usuário atualizado',
                description: 'As alterações foram salvas com sucesso.',
                type: 'success'
            });
        },
        onError: () => {
            toast({
                title: 'Erro ao atualizar',
                description: 'Não foi possível salvar as alterações.',
                type: 'error'
            });
        }
    });

    const handleRoleChange = (id: string, newRole: AppRole) => {
        if (confirm(`Tem certeza que deseja alterar o papel deste usuário para ${newRole}?`)) {
            updateProfileMutation.mutate({ id, updates: { role: newRole } });
        }
    };

    const handleToggleActive = (id: string, currentStatus: boolean) => {
        const action = currentStatus ? 'desativar' : 'ativar';
        if (confirm(`Tem certeza que deseja ${action} este usuário?`)) {
            updateProfileMutation.mutate({ id, updates: { active: !currentStatus } });
        }
    };

    const handleEditClick = (user: Profile) => {
        setEditingUser(user);
        setIsEditModalOpen(true);
    };

    // Selection Logic
    const toggleUserSelection = (userId: string) => {
        const newSelected = new Set(selectedUsers);
        if (newSelected.has(userId)) {
            newSelected.delete(userId);
        } else {
            newSelected.add(userId);
        }
        setSelectedUsers(newSelected);
    };

    const toggleSelectAll = () => {
        if (!filteredProfiles) return;

        if (selectedUsers.size === filteredProfiles.length) {
            setSelectedUsers(new Set());
        } else {
            const allIds = new Set(filteredProfiles.map(p => p.id));
            setSelectedUsers(allIds);
        }
    };

    const filteredProfiles = profiles?.filter(profile => {
        const matchesSearch = (profile.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (profile.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // Intelligence Stats
    const totalUsers = profiles?.length || 0;
    const activeUsers = profiles?.filter(p => p.active).length || 0;
    const inactiveUsers = totalUsers - activeUsers;
    const adminCount = profiles?.filter(p => p.role === 'admin').length || 0;

    if (isLoadingUser) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!currentUser || currentUser.role !== 'admin') {
        return (
            <div className="p-8 flex flex-col items-center justify-center h-full text-gray-500">
                <Shield className="w-16 h-16 mb-4 text-gray-300" />
                <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
                <p>Apenas administradores podem gerenciar usuários.</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto relative">
            <AdminPageHeader
                title="Gestão de Pessoas"
                subtitle="Gerencie usuários, times e permissões."
                icon={<Users className="w-6 h-6" />}
                stats={[
                    {
                        label: 'Total',
                        value: totalUsers,
                        icon: <Users className="w-3 h-3" />,
                        color: 'blue'
                    },
                    {
                        label: 'Ativos',
                        value: activeUsers,
                        icon: <UserCheck className="w-3 h-3" />,
                        color: 'green'
                    },
                    {
                        label: 'Inativos',
                        value: inactiveUsers,
                        icon: <UserX className="w-3 h-3" />,
                        color: inactiveUsers > 0 ? 'red' : 'gray'
                    },
                    {
                        label: 'Admins',
                        value: adminCount,
                        icon: <ShieldAlert className="w-3 h-3" />,
                        color: 'purple'
                    }
                ]}
                actions={<AddUserModal teams={(teams || []).map(t => ({ ...t, department_id: t.department_id || '' }))} onUserCreated={() => queryClient.invalidateQueries({ queryKey: ['profiles'] })} />}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList>
                    <TabsTrigger value="users">Usuários</TabsTrigger>
                    <TabsTrigger value="teams">Times & Áreas</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-6">
                    {/* Filters */}
                    <div className="flex gap-4 mb-6 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Buscar por nome ou email..."
                                className="pl-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-48">
                            <Select
                                value={roleFilter}
                                onChange={(value) => setRoleFilter(value as AppRole | 'all')}
                                options={[
                                    { value: 'all', label: 'Todos os Papéis' },
                                    ...ROLES.map(r => ({ value: r.value, label: r.label }))
                                ]}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mb-20">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            checked={filteredProfiles?.length ? selectedUsers.size === filteredProfiles.length : false}
                                            onChange={toggleSelectAll}
                                        />
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Papel (Role)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <tr key={i}>
                                            <td className="px-6 py-4"><Skeleton className="h-4 w-4" /></td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <Skeleton className="h-10 w-10 rounded-full" />
                                                    <div className="ml-4 space-y-2">
                                                        <Skeleton className="h-4 w-32" />
                                                        <Skeleton className="h-3 w-48" />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Skeleton className="h-8 w-32 rounded-md" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Skeleton className="h-4 w-24" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Skeleton className="h-7 w-20 rounded-full" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Skeleton className="h-4 w-24" />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredProfiles?.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            Nenhum usuário encontrado.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProfiles?.map((profile) => (
                                        <tr key={profile.id} className={`hover:bg-gray-50 transition-colors ${selectedUsers.has(profile.id) ? 'bg-blue-50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedUsers.has(profile.id)}
                                                    onChange={() => toggleUserSelection(profile.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-lg">
                                                        {profile.nome?.charAt(0).toUpperCase() || '?'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{profile.nome || 'Sem nome'}</div>
                                                        <div className="text-sm text-gray-500">{profile.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="w-32">
                                                    <Select
                                                        value={profile.role || 'sdr'}
                                                        onChange={(value) => handleRoleChange(profile.id, value as AppRole)}
                                                        options={ROLES.map(r => ({ value: r.value, label: r.label }))}
                                                        className="h-8"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {profile.teams?.name || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="sr-only peer"
                                                        checked={profile.is_admin || false}
                                                        onChange={(e) => updateProfileMutation.mutate({
                                                            id: profile.id,
                                                            updates: { is_admin: e.target.checked }
                                                        })}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                                    <span className="ml-3 text-sm font-medium text-gray-700">
                                                        {profile.is_admin ? 'Sim' : 'Não'}
                                                    </span>
                                                </label>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${profile.active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {profile.active ? 'Ativo' : 'Inativo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleActive(profile.id, profile.active ?? true)}
                                                        className={profile.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                                                    >
                                                        {profile.active ? 'Desativar' : 'Ativar'}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                                                        onClick={() => handleEditClick(profile)}
                                                        title="Editar Usuário"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Floating Action Bar */}
                    {selectedUsers.size > 0 && (
                        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-gray-200 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 animate-in slide-in-from-bottom-4 z-50">
                            <div className="flex items-center gap-2 border-r border-gray-200 pr-4">
                                <CheckSquare className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-gray-900">{selectedUsers.size} selecionados</span>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2"
                                onClick={() => setIsBulkMoveModalOpen(true)}
                            >
                                <ArrowRightLeft className="w-4 h-4" />
                                Mover para Time
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="gap-2 text-gray-500 hover:text-gray-900"
                                onClick={() => setSelectedUsers(new Set())}
                            >
                                <X className="w-4 h-4" />
                                Cancelar
                            </Button>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="teams" className="mt-6">
                    <TeamManagement />
                </TabsContent>
            </Tabs>

            <EditUserModal
                user={editingUser}
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                teams={teams || []}
            />

            <BulkMoveModal
                isOpen={isBulkMoveModalOpen}
                onClose={() => setIsBulkMoveModalOpen(false)}
                selectedUserIds={Array.from(selectedUsers)}
                teams={teams || []}
                onSuccess={() => setSelectedUsers(new Set())}
            />
        </div>
    );
}

