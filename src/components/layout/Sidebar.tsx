import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ProductSwitcher } from './ProductSwitcher'
import { useAuth } from '../../contexts/AuthContext'
import NotificationCenter from './NotificationCenter'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Funil', href: '/pipeline', icon: Kanban },
    { name: 'Grupos', href: '/groups', icon: Users },
    { name: 'Pessoas', href: '/people', icon: Users },
    { name: 'Configurações', href: '/settings', icon: Settings },
]

export default function Sidebar() {
    const location = useLocation()
    const { session } = useAuth()

    const userInitials = session?.user?.email?.substring(0, 2).toUpperCase() || 'U'
    const userName = session?.user?.email?.split('@')[0] || 'Usuário'

    return (
        <aside className="flex h-screen w-64 flex-col bg-primary-dark text-white shadow-lg transition-all duration-300">
            <div className="flex h-16 items-center px-6">
                <span className="text-xl font-semibold tracking-tight">Welcome CRM</span>
            </div>

            {/* Global Product Switcher */}
            <div className="px-4 mb-2">
                <ProductSwitcher />
            </div>

            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                                isActive
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-primary-light hover:bg-primary hover:text-white"
                            )}
                        >
                            <Icon className={cn(
                                "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                                isActive ? "text-white" : "text-primary-light group-hover:text-white"
                            )} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="border-t border-primary/20 p-4">
                <div className="flex items-center gap-3 rounded-lg bg-primary/10 px-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white">
                        {userInitials}
                    </div>
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <span className="text-sm font-medium text-white truncate capitalize">{userName}</span>
                        <span className="text-xs text-primary-light truncate">{session?.user?.email}</span>
                    </div>
                    <NotificationCenter triggerClassName="text-primary-light hover:text-white hover:bg-primary/20" />
                </div>
            </div>
        </aside>
    )
}
