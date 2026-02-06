import { useAuth } from '@/contexts/AuthContext'

const RECEITA_VIEW_ROLES = ['admin', 'gestor', 'financeiro']
const RECEITA_EDIT_ROLES = ['admin', 'gestor']

export function useReceitaPermission() {
  const { profile } = useAuth()

  const role = profile?.role ?? ''

  return {
    canView: !!profile?.is_admin || RECEITA_VIEW_ROLES.includes(role),
    canEdit: !!profile?.is_admin || RECEITA_EDIT_ROLES.includes(role),
  }
}
