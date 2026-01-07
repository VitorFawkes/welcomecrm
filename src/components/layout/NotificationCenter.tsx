import { useState } from 'react';
import { Bell, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

// Mock Notifications - Should come from DB 'notifications' table
const MOCK_NOTIFICATIONS = [
    {
        id: '1',
        title: 'SLA Atrasado',
        message: 'O card "Viagem Disney" está na etapa "Novo Lead" há mais de 2 horas.',
        type: 'warning',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
    },
    {
        id: '2',
        title: 'Novo Lead Atribuído',
        message: 'Você recebeu um novo lead: "João Silva".',
        type: 'info',
        read: false,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2 hours ago
    },
    {
        id: '3',
        title: 'Tarefa Concluída',
        message: 'A tarefa "Enviar Orçamento" foi marcada como feita.',
        type: 'success',
        read: true,
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
    }
];

export default function NotificationCenter({ triggerClassName }: { triggerClassName?: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    return (
        <div className="relative">
            <Button
                variant="ghost"
                size="icon"
                className={cn("relative text-gray-500 hover:text-gray-700", triggerClassName)}
                onClick={() => setIsOpen(!isOpen)}
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                )}
            </Button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-80 z-50 rounded-lg border border-gray-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in-0 zoom-in-95 duration-100">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={handleMarkAllRead}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                    Marcar todas como lidas
                                </button>
                            )}
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-sm text-gray-500">
                                    Nenhuma notificação.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {notifications.map((notification) => (
                                        <div
                                            key={notification.id}
                                            className={cn(
                                                "p-4 hover:bg-gray-50 transition-colors",
                                                !notification.read && "bg-blue-50/50"
                                            )}
                                        >
                                            <div className="flex gap-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-500" />}
                                                    {notification.type === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                                                    {notification.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                                                    {notification.type === 'info' && <Info className="h-5 w-5 text-blue-500" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={cn("text-sm font-medium text-gray-900", !notification.read && "font-semibold")}>
                                                        {notification.title}
                                                    </p>
                                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                                                        {notification.message}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                                {!notification.read && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleMarkAsRead(notification.id);
                                                        }}
                                                        className="flex-shrink-0 text-blue-600 hover:text-blue-800"
                                                        title="Marcar como lida"
                                                    >
                                                        <div className="h-2 w-2 rounded-full bg-blue-600" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
