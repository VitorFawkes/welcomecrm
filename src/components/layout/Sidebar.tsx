import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Kanban, Users, Settings, FileText, ChevronRight, User } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ProductSwitcher } from './ProductSwitcher'
import { useAuth } from '../../contexts/AuthContext'
import NotificationCenter from './NotificationCenter'

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Funil', href: '/pipeline', icon: Kanban },
    { name: 'Propostas', href: '/proposals', icon: FileText },
    { name: 'Grupos', href: '/groups', icon: Users },
    { name: 'Contatos', href: '/people', icon: User },
    { name: 'Configurações', href: '/settings', icon: Settings },
]

export default function Sidebar() {
    const location = useLocation()
    const { session } = useAuth()
    const [isExpanded, setIsExpanded] = useState(false)

    const userInitials = session?.user?.email?.substring(0, 2).toUpperCase() || 'U'
    const userName = session?.user?.email?.split('@')[0] || 'Usuário'

    return (
        <aside
            className={cn(
                "flex h-screen flex-col bg-primary-dark text-white shadow-lg transition-all duration-300 ease-in-out",
                isExpanded ? "w-64" : "w-16"
            )}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Header */}
            <div className="flex h-16 items-center px-4 gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary flex-shrink-0">
                    <span className="text-sm font-bold text-white">W</span>
                </div>
                <span className={cn(
                    "text-lg font-semibold tracking-tight whitespace-nowrap transition-opacity duration-200",
                    isExpanded ? "opacity-100" : "opacity-0"
                )}>
                    Welcome CRM
                </span>
            </div>

            {/* Global Product Switcher - Only show when expanded */}
            <div className={cn(
                "px-3 mb-2 transition-opacity duration-200",
                isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
                <ProductSwitcher />
            </div>

            <nav className="flex-1 space-y-1 px-2 py-4">
                {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')

                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            title={!isExpanded ? item.name : undefined}
                            className={cn(
                                "group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-primary-light hover:bg-primary hover:text-white"
                            )}
                        >
                            <Icon className={cn(
                                "h-5 w-5 flex-shrink-0 transition-colors",
                                isActive ? "text-white" : "text-primary-light group-hover:text-white"
                            )} />
                            <span className={cn(
                                "ml-3 whitespace-nowrap transition-opacity duration-200",
                                isExpanded ? "opacity-100" : "opacity-0 w-0"
                            )}>
                                {item.name}
                            </span>
                        </Link>
                    )
                })}
            </nav>

            {/* User section */}
            <div className="border-t border-primary/20 p-2">
                <div className={cn(
                    "flex items-center gap-3 rounded-lg bg-primary/10 px-2 py-2",
                    isExpanded ? "" : "justify-center"
                )}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-white flex-shrink-0">
                        {userInitials}
                    </div>
                    {isExpanded && (
                        <>
                            <div className="flex flex-1 flex-col overflow-hidden">
                                <span className="text-sm font-medium text-white truncate capitalize">{userName}</span>
                                <span className="text-xs text-primary-light truncate">{session?.user?.email}</span>
                            </div>
                            <NotificationCenter triggerClassName="text-primary-light hover:text-white hover:bg-primary/20" />
                        </>
                    )}
                </div>
            </div>

            {/* Expand indicator when collapsed */}
            {!isExpanded && (
                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2 bg-primary rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-3 w-3 text-white" />
                </div>
            )}
        </aside>
    )
}
