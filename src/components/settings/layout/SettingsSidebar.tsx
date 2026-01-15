import { NavLink } from 'react-router-dom';
import {
    User,
    Database,
    Kanban,
    LayoutList,
    Tags,
    Webhook,
    Activity,
    Users as UsersIcon,
    MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/Badge';

export default function SettingsSidebar() {
    const { } = useAuth();
    // TODO: Check if user is admin properly.
    const isAdmin = true;

    // Fetch blocked integration events count
    const { data: blockedCount = 0 } = useQuery({
        queryKey: ['integration-blocked-count'],
        queryFn: async () => {
            const { count } = await supabase
                .from('integration_events')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'blocked');
            return count || 0;
        },
        refetchInterval: 60000 // Refresh every minute
    });

    return (
        <aside className="w-64 flex flex-col h-full border-r border-border bg-background">
            {/* Header - Minimal & Clean - NO LOGO HERE */}
            <div className="px-6 py-8">
                <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Configurações</h2>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 space-y-8">
                {/* Minha Conta */}
                <div>
                    <div className="space-y-0.5">
                        <NavLink
                            to="/settings/profile"
                            className={({ isActive }) => cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary/10 text-primary shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <User className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                    Perfil
                                </>
                            )}
                        </NavLink>
                    </div>
                </div>

                {/* Sistema (Admin) */}
                {isAdmin && (
                    <div>
                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-3 mt-6">
                            Sistema
                        </h3>
                        <div className="space-y-0.5">
                            <NavLink
                                to="/settings/system/users"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <UsersIcon className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        Gestão de Equipe
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/governance"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Database className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        Governança de Dados
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/pipeline"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Kanban className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        Pipeline de Vendas
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/kanban-cards"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <LayoutList className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        Cards & Visualização
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/categories"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Tags className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        Categorias & Tags
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/integrations"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Webhook className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        <span className="flex-1">Integrações</span>
                                        {blockedCount > 0 && (
                                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                                                {blockedCount > 99 ? '99+' : blockedCount}
                                            </Badge>
                                        )}
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/whatsapp"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <MessageSquare className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        WhatsApp
                                    </>
                                )}
                            </NavLink>

                            <NavLink
                                to="/settings/system/health"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Activity className={cn("w-4 h-4", isActive ? "text-primary" : "text-muted-foreground")} />
                                        Saúde do Sistema
                                    </>
                                )}
                            </NavLink>
                        </div>
                    </div>
                )}
            </nav>
        </aside>
    );
}
