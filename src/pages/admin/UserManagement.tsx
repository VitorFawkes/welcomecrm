import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../database.types';
import {
    Users,
    Search,
    Shield,
    MoreVertical
} from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Skeleton } from '../../components/ui/Skeleton';
import { useToast } from '../../contexts/ToastContext';

type Profile = Database['public']['Tables']['profiles']['Row'];
type AppRole = Database['public']['Enums']['app_role'];

const ROLES: { value: AppRole; label: string; color: string }[] = [
    { value: 'admin', label: 'Administrador', color: 'bg-red-100 text-red-800' },
    { value: 'gestor', label: 'Gestor', color: 'bg-purple-100 text-purple-800' },
    { value: 'sdr', label: 'SDR', color: 'bg-blue-100 text-blue-800' },
    { value: 'vendas', label: 'Vendas (Closer)', color: 'bg-green-100 text-green-800' },
    { value: 'pos_venda', label: 'Pós-Venda / Planner', color: 'bg-orange-100 text-orange-800' },
    { value: 'concierge', label: 'Concierge', color: 'bg-pink-100 text-pink-800' },
    { value: 'financeiro', label: 'Financeiro', color: 'bg-yellow-100 text-yellow-800' },
];

export default function UserManagement() {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');

    // Fetch Current User to check if Admin
    const { data: currentUser, isLoading: isLoadingUser } = useQuery({
        queryKey: ['currentUser'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const { data } = await (supabase.from('profiles') as any).select('*').eq('id', user.id).single();
            return data;
        }
    });

    // Fetch All Profiles
    const { data: profiles, isLoading } = useQuery({
        queryKey: ['profiles'],
        queryFn: async () => {
            const { data, error } = await (supabase.from('profiles') as any)
                .select('*')
                .order('nome');

            if (error) throw error;
            return data as Profile[] | null;
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

    const filteredProfiles = profiles?.filter(profile => {
        const matchesSearch = (profile.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (profile.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || profile.role === roleFilter;
        return matchesSearch && matchesRole;
    });

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
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="w-6 h-6" />
                        Gestão de Usuários
                    </h1>
                    <p className="text-gray-500 mt-1">Gerencie acessos, papéis e status dos colaboradores.</p>
                </div>
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium">
                    Total: {profiles?.length || 0} usuários
                </div>
            </div>

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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuário</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Papel (Role)</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Acesso</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i}>
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
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    Nenhum usuário encontrado.
                                </td>
                            </tr>
                        ) : (
                            filteredProfiles?.map((profile) => (
                                <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {/* Placeholder for Last Login - Supabase Auth tracks this but it's not in public.profiles by default unless synced */}
                                        -
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleToggleActive(profile.id, profile.active ?? true)}
                                            className={profile.active ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                                        >
                                            {profile.active ? 'Desativar' : 'Ativar'}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600">
                                            <MoreVertical className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

