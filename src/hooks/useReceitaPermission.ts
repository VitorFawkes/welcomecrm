/**
 * useReceitaPermission
 *
 * Desde 2026-02: TODOS podem ver e editar receita.
 * O Planner precisa inserir custos e ver margem para fechar vendas.
 * Hook mantido para compatibilidade com os 8 arquivos que o usam.
 */
export function useReceitaPermission() {
  return {
    canView: true,
    canEdit: true,
  }
}
