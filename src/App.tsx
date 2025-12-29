import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import CardDetail from './pages/CardDetail'
import People from './pages/People'

import AdminPage from './pages/AdminPage'
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

                {/* Protected Routes */}
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/cards/:id" element={<CardDetail />} />
                  <Route path="/cards" element={<div className="p-8">Cards List (Placeholder)</div>} />
                  <Route path="/cards" element={<div className="p-8">Cards List (Placeholder)</div>} />
                  <Route path="/people" element={<People />} />
                  <Route path="/tasks" element={<div className="p-8">Tasks (Placeholder)</div>} />
                  <Route path="/tasks" element={<div className="p-8">Tasks (Placeholder)</div>} />
                  <Route path="/admin" element={<AdminPage />} />
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
