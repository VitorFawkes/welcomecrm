import { NavLink } from 'react-router-dom';
import {
    User,
    Shield,
    Database,
    Kanban,
    LayoutList,
    Tags,
    Webhook,
    MessageSquare,
    Activity,
    Users as UsersIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export default function SettingsSidebar() {
    const { } = useAuth();
    // TODO: Check if user is admin properly.
    const isAdmin = true;

    return (
        <aside className="w-64 flex flex-col h-full border-r border-gray-200/40 bg-white/40 backdrop-blur-md">
            {/* Header - Minimal & Clean - NO LOGO HERE */}
            <div className="px-6 py-8">
                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Configurações</h2>
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
                                    ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                    : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                            )}
                        >
                            {({ isActive }) => (
                                <>
                                    <User className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                    Perfil
                                </>
                            )}
                        </NavLink>
                    </div>
                </div>

                {/* Sistema (Admin) */}
                {isAdmin && (
                    <div>
                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 px-3 mt-6">
                            Sistema
                        </h3>
                        <div className="space-y-0.5">
                            <NavLink
                                to="/settings/system/users"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <UsersIcon className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                        Gestão de Equipe
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/governance"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Database className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                        Governança de Dados
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/pipeline"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Kanban className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                        Pipeline de Vendas
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/kanban-cards"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <LayoutList className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                        Cards & Visualização
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/categories"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Tags className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                        Categorias & Tags
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/integrations"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Webhook className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                        Integrações
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/whatsapp"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <MessageSquare className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
                                        WhatsApp
                                    </>
                                )}
                            </NavLink>
                            <NavLink
                                to="/settings/system/health"
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                                    isActive
                                        ? "bg-white text-gray-900 shadow-sm ring-1 ring-black/5"
                                        : "text-gray-500 hover:bg-white/50 hover:text-gray-900"
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Activity className={cn("w-4 h-4", isActive ? "text-primary" : "text-gray-400")} />
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
