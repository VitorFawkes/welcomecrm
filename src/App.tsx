import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import InvitePage from './pages/InvitePage'
import Pipeline from './pages/Pipeline'
import CardDetail from './pages/CardDetail'
import People from './pages/People'
import GroupsPage from './pages/GroupsPage'

import SettingsPage from './pages/SettingsPage'
import ProfileSettings from './components/settings/profile/ProfileSettings'

// Admin Components for Settings Routes
import StudioUnified from './components/admin/studio/StudioUnified'
import PipelineStudio from './pages/admin/PipelineStudio'
import UserManagement from './pages/admin/UserManagement'
import CategoryManagement from './pages/admin/CategoryManagement'
import CRMHealth from './pages/admin/CRMHealth'
import WhatsAppGovernance from './pages/admin/WhatsAppGovernance'
import { IntegrationsPage } from './components/admin/integrations/IntegrationsPage'
import KanbanCardSettings from './components/admin/KanbanCardSettings'
import { ToastProvider } from './contexts/ToastContext'
import { ErrorBoundary } from './components/ui/ErrorBoundary'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <AuthProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/invite/:token" element={<InvitePage />} />

                {/* Protected Routes */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/cards/:id" element={<CardDetail />} />
                  <Route path="/people" element={<People />} />

                  <Route path="/admin" element={<Navigate to="/settings/system/governance" replace />} />

                  {/* Settings Routes */}
                  <Route path="/settings" element={<SettingsPage />}>
                    <Route index element={<Navigate to="/settings/profile" replace />} />
                    <Route path="profile" element={<ProfileSettings />} />

                    {/* Workspace Settings Placeholders */}
                    <Route path="workspace/general" element={<div className="p-4">Configurações Gerais do Espaço de Trabalho (Em Breve)</div>} />
                    <Route path="workspace/members" element={<div className="p-4">Gerenciamento de Membros (Em Breve)</div>} />

                    {/* System Settings (Admin) */}
                    <Route path="system/governance" element={<StudioUnified />} />
                    <Route path="system/pipeline" element={<PipelineStudio />} />
                    <Route path="system/kanban-cards" element={<KanbanCardSettings />} />
                    <Route path="system/categories" element={<CategoryManagement />} />
                    <Route path="system/integrations" element={<IntegrationsPage />} />
                    <Route path="system/whatsapp" element={<WhatsAppGovernance />} />
                    <Route path="system/users" element={<UserManagement />} />
                    <Route path="system/health" element={<CRMHealth />} />
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </AuthProvider>
      </ErrorBoundary>
    </QueryClientProvider >
  )
}

export default App
