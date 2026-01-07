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
        <div className="fixed inset-0 flex bg-gray-100 overflow-hidden">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">

                <main className="flex-1 relative flex flex-col overflow-hidden bg-muted">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
