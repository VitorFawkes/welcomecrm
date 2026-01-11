import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Sidebar from './Sidebar'
import { ThemeBoundary } from "../ui/ThemeBoundary";


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
        <div className="fixed inset-0 flex overflow-hidden">
            <ThemeBoundary mode="dark" className="flex-shrink-0">
                <Sidebar />
            </ThemeBoundary>

            <ThemeBoundary mode="light" className="flex flex-1 flex-col overflow-hidden relative">
                <main className="flex-1 relative flex flex-col overflow-hidden bg-surface-secondary">
                    <Outlet />
                </main>
            </ThemeBoundary>
        </div>
    );
}
