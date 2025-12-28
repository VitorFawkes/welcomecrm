export const SECTIONS = [
    { value: 'trip_info', label: 'Informações da Viagem', color: 'bg-blue-50 text-blue-700 border-blue-100' },
    { value: 'observacoes_criticas', label: 'Informações Importantes', color: 'bg-red-50 text-red-700 border-red-100' },
    { value: 'people', label: 'Pessoas / Viajantes', color: 'bg-purple-50 text-purple-700 border-purple-100' },
    { value: 'payment', label: 'Pagamento', color: 'bg-green-50 text-green-700 border-green-100' },
    { value: 'system', label: 'Sistema / Interno', color: 'bg-gray-50 text-gray-700 border-gray-100' },
    { value: 'details', label: 'Outros Detalhes', color: 'bg-orange-50 text-orange-700 border-orange-100' }
] as const

export const FIELD_TYPES = [
    { value: 'text', label: 'Texto Simples' },
    { value: 'textarea', label: 'Texto Longo (Área)' },
    { value: 'number', label: 'Número' },
    { value: 'date', label: 'Data' },
    { value: 'currency', label: 'Moeda' },
    { value: 'select', label: 'Seleção Única' },
    { value: 'multiselect', label: 'Múltipla Seleção' },
    { value: 'boolean', label: 'Sim/Não' },
    { value: 'json', label: 'JSON (Avançado)' }
] as const

export const MACRO_STAGES = [
    { id: 'SDR', label: 'SDR (Pré-Venda)', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-50' },
    { id: 'Planner', label: 'Planner (Venda)', color: 'bg-purple-500', textColor: 'text-purple-700', bgColor: 'bg-purple-50' },
    { id: 'Pós-venda', label: 'Pós-Venda', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-50' }
] as const

export const COLORS = [
    { value: 'gray', bg: 'bg-gray-100', text: 'text-gray-800' },
    { value: 'blue', bg: 'bg-blue-100', text: 'text-blue-800' },
    { value: 'green', bg: 'bg-green-100', text: 'text-green-800' },
    { value: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-800' },
    { value: 'red', bg: 'bg-red-100', text: 'text-red-800' },
    { value: 'purple', bg: 'bg-purple-100', text: 'text-purple-800' },
    { value: 'pink', bg: 'bg-pink-100', text: 'text-pink-800' },
] as const

export const ROLES = [
    { value: 'admin', label: 'Administrador', color: 'bg-red-100 text-red-800' },
    { value: 'gestor', label: 'Gestor', color: 'bg-purple-100 text-purple-800' },
    { value: 'sdr', label: 'SDR', color: 'bg-blue-100 text-blue-800' },
    { value: 'vendas', label: 'Vendas (Closer)', color: 'bg-green-100 text-green-800' },
    { value: 'pos_venda', label: 'Pós-Venda / Planner', color: 'bg-orange-100 text-orange-800' },
    { value: 'concierge', label: 'Concierge', color: 'bg-pink-100 text-pink-800' },
    { value: 'financeiro', label: 'Financeiro', color: 'bg-yellow-100 text-yellow-800' },
] as const
