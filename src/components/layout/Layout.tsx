import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from './Sidebar'
import NotificationCenter from './NotificationCenter'

export default function Layout() {
    const { session, loading } = useAuth()

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            </div>
        )
    }

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return (
        <div className="flex h-screen bg-gray-100">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <header className="flex h-16 items-center justify-between border-b bg-white px-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-800">Welcome CRM</h2>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">Olá, {session.user.email}</span>
                        <NotificationCenter />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto bg-muted p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
