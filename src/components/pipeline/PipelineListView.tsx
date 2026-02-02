import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowUpDown, Calendar, Clock, AlertCircle, User as UserIcon, Trash2, Edit, Phone, Mail, MoreHorizontal, CheckCircle2, Plane, AlertTriangle } from 'lucide-react'
import { usePipelineCards } from '../../hooks/usePipelineCards'
import { usePipelineFilters, type ViewMode, type SubView, type FilterState } from '../../hooks/usePipelineFilters'
import { useFilterOptions } from '../../hooks/useFilterOptions'
import { usePipelineStages } from '../../hooks/usePipelineStages'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table'
import { Badge } from '../ui/Badge'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Checkbox } from '../ui/checkbox'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'
import { ColumnToggle } from '../ui/data-grid/ColumnToggle'
import { BulkActions } from '../ui/data-grid/BulkActions'
import { BulkEditModal, type BulkEditField } from '../ui/data-grid/BulkEditModal'
import { useDeleteCard } from '../../hooks/useDeleteCard'
import DeleteCardModal from '../card/DeleteCardModal'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu'
import { Button } from '../ui/Button'

type Card = Database['public']['Views']['view_cards_acoes']['Row']
type Product = Database['public']['Enums']['app_product'] | 'ALL'

interface PipelineListViewProps {
    productFilter: Product
    viewMode: ViewMode
    subView: SubView
    filters: FilterState
    onCardClick?: (cardId: string) => void
}

export default function PipelineListView({ productFilter, viewMode, subView, filters }: PipelineListViewProps) {
    const queryClient = useQueryClient()
    const { groupFilters } = usePipelineFilters()

    const { data: cards, isLoading } = usePipelineCards({
        productFilter,
        viewMode,
        subView,
        filters,
        groupFilters
    })

    // Dados para bulk actions
    const { data: filterOptions } = useFilterOptions()
    const { data: stages } = usePipelineStages()

    // --- State ---
    const [sortField, setSortField] = useState<keyof Card | 'proxima_tarefa'>('created_at')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
    const [selectedCards, setSelectedCards] = useState<string[]>([])

    // Type for visible columns
    type VisibleColumnsState = {
        select: boolean
        atencao: boolean
        titulo: boolean
        etapa_nome: boolean
        valor_estimado: boolean
        prioridade: boolean
        proxima_tarefa: boolean
        dono_atual_nome: boolean
        data_viagem_inicio: boolean
        created_at: boolean
        updated_at: boolean
        origem: boolean
        produto: boolean
        sdr_nome: boolean
        vendas_nome: boolean
        tempo_etapa_dias: boolean
        acoes: boolean
    }

    // Load saved column preferences from localStorage
    const [visibleColumns, setVisibleColumns] = useState<VisibleColumnsState>(() => {
        const saved = localStorage.getItem('pipeline_list_columns')
        if (saved) {
            try {
                return JSON.parse(saved)
            } catch {
                // fallback to defaults
            }
        }
        return {
            select: true,
            atencao: true, // Nova coluna de atenção
            titulo: true,
            etapa_nome: true,
            valor_estimado: true,
            prioridade: true,
            proxima_tarefa: true,
            dono_atual_nome: true,
            data_viagem_inicio: false,
            created_at: false,
            updated_at: false,
            origem: false,
            produto: false,
            sdr_nome: false,
            vendas_nome: false,
            tempo_etapa_dias: false,
            acoes: true // Coluna de ações rápidas
        }
    })

    // Persist column preferences
    useEffect(() => {
        localStorage.setItem('pipeline_list_columns', JSON.stringify(visibleColumns))
    }, [visibleColumns])

    // Quick Filters state
    type QuickFilterType = 'overdue' | 'trip_soon' | 'sla' | 'no_task' | 'high_priority'
    const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilterType[]>([])

    const toggleQuickFilter = (filter: QuickFilterType) => {
        setActiveQuickFilters(prev =>
            prev.includes(filter)
                ? prev.filter(f => f !== filter)
                : [...prev, filter]
        )
    }

    // Calculate quick filter counts
    const quickFilterCounts = {
        overdue: cards?.filter(c => (c.tarefas_atrasadas as number) > 0).length ?? 0,
        trip_soon: cards?.filter(c => c.dias_ate_viagem !== null && (c.dias_ate_viagem as number) <= 30 && (c.dias_ate_viagem as number) >= 0).length ?? 0,
        sla: cards?.filter(c => (c.tempo_etapa_dias as number) > 7).length ?? 0,
        no_task: cards?.filter(c => !c.proxima_tarefa).length ?? 0,
        high_priority: cards?.filter(c => c.prioridade === 'alta').length ?? 0,
    }

    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const { softDelete, isDeleting } = useDeleteCard()

    // Mutation para marcar tarefa como concluída
    const completeTaskMutation = useMutation({
        mutationFn: async (taskId: string) => {
            const { error } = await supabase
                .from('tarefas')
                .update({
                    concluida: true,
                    status: 'concluida',
                    concluida_em: new Date().toISOString()
                })
                .eq('id', taskId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            toast.success('Tarefa concluída!')
        },
        onError: () => {
            toast.error('Erro ao concluir tarefa')
        }
    })

    // --- Handlers ---
    const handleSort = (field: keyof Card | 'proxima_tarefa') => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    const handleSelectAll = (checked: boolean) => {
        if (checked && cards) {
            setSelectedCards(cards.map(c => c.id!))
        } else {
            setSelectedCards([])
        }
    }

    const handleSelectRow = (cardId: string, checked: boolean) => {
        if (checked) {
            setSelectedCards(prev => [...prev, cardId])
        } else {
            setSelectedCards(prev => prev.filter(id => id !== cardId))
        }
    }

    const handleColumnToggle = (columnId: string, isVisible: boolean) => {
        setVisibleColumns(prev => ({ ...prev, [columnId]: isVisible }))
    }

    const handleBulkDelete = () => {
        setShowDeleteModal(true)
    }

    const confirmBulkDelete = async () => {
        // Sequential delete for now (could be optimized with a bulk RPC)
        for (const id of selectedCards) {
            await softDelete(id)
        }
        setSelectedCards([])
        setShowDeleteModal(false)
        queryClient.invalidateQueries({ queryKey: ['cards'] })
    }

    const handleBulkEdit = async (fieldId: string, value: any) => {
        try {
            const updates: Record<string, any> = {}

            if (fieldId === 'data_viagem_inicio') {
                updates.data_viagem_inicio = value
            } else if (fieldId === 'prioridade') {
                updates.prioridade = value
            } else if (fieldId === 'dono_atual_id') {
                updates.dono_atual_id = value
            } else if (fieldId === 'etapa_id') {
                updates.etapa_id = value
            }

            // Perform update
            const { error } = await supabase
                .from('cards')
                .update(updates)
                .in('id', selectedCards)

            if (error) throw error

            toast.success(`${selectedCards.length} cards atualizados com sucesso!`)
            setSelectedCards([])
            queryClient.invalidateQueries({ queryKey: ['cards'] })
        } catch (error) {
            console.error('Error updating cards:', error)
            toast.error('Erro ao atualizar cards.')
        }
    }

    // --- Quick Filters + Sorting Logic ---
    const filteredCards = (cards || []).filter(card => {
        if (activeQuickFilters.length === 0) return true

        // Card must match ALL active filters (AND logic)
        return activeQuickFilters.every(filter => {
            switch (filter) {
                case 'overdue':
                    return (card.tarefas_atrasadas as number) > 0
                case 'trip_soon':
                    return card.dias_ate_viagem !== null && (card.dias_ate_viagem as number) <= 30 && (card.dias_ate_viagem as number) >= 0
                case 'sla':
                    return (card.tempo_etapa_dias as number) > 7
                case 'no_task':
                    return !card.proxima_tarefa
                case 'high_priority':
                    return card.prioridade === 'alta'
                default:
                    return true
            }
        })
    })

    const sortedCards = [...filteredCards].sort((a, b) => {
        let aValue: any = a[sortField as keyof Card]
        let bValue: any = b[sortField as keyof Card]

        // Special handling for nested/complex fields
        if (sortField === 'proxima_tarefa') {
            aValue = (a.proxima_tarefa as any)?.data_vencimento || ''
            bValue = (b.proxima_tarefa as any)?.data_vencimento || ''
        }

        if (!aValue && !bValue) return 0
        if (!aValue) return 1
        if (!bValue) return -1

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
    })

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">Carregando lista...</div>
    }

    const columnsConfig = [
        { id: 'atencao', label: 'Atenção', isVisible: visibleColumns.atencao },
        { id: 'titulo', label: 'Negócio', isVisible: visibleColumns.titulo },
        { id: 'etapa_nome', label: 'Etapa', isVisible: visibleColumns.etapa_nome },
        { id: 'valor_estimado', label: 'Valor', isVisible: visibleColumns.valor_estimado },
        { id: 'prioridade', label: 'Prioridade', isVisible: visibleColumns.prioridade },
        { id: 'proxima_tarefa', label: 'Próxima Tarefa', isVisible: visibleColumns.proxima_tarefa },
        { id: 'dono_atual_nome', label: 'Responsável', isVisible: visibleColumns.dono_atual_nome },
        { id: 'data_viagem_inicio', label: 'Data Viagem', isVisible: visibleColumns.data_viagem_inicio },
        { id: 'created_at', label: 'Data Criação', isVisible: visibleColumns.created_at },
        { id: 'updated_at', label: 'Última Atualização', isVisible: visibleColumns.updated_at },
        { id: 'origem', label: 'Origem', isVisible: visibleColumns.origem },
        { id: 'produto', label: 'Produto', isVisible: visibleColumns.produto },
        { id: 'sdr_nome', label: 'SDR', isVisible: visibleColumns.sdr_nome },
        { id: 'vendas_nome', label: 'Closer', isVisible: visibleColumns.vendas_nome },
        { id: 'tempo_etapa_dias', label: 'Dias na Etapa', isVisible: visibleColumns.tempo_etapa_dias },
        { id: 'acoes', label: 'Ações', isVisible: visibleColumns.acoes },
    ]

    // Helper: Check if card needs attention
    const getAttentionIndicators = (card: Card) => {
        const indicators: { type: 'overdue' | 'trip_soon' | 'sla' | 'no_task'; label: string }[] = []

        // Tarefas atrasadas
        if ((card.tarefas_atrasadas as number) > 0) {
            indicators.push({ type: 'overdue', label: `${card.tarefas_atrasadas} tarefa(s) atrasada(s)` })
        }

        // Viagem próxima (menos de 30 dias)
        if (card.dias_ate_viagem !== null && (card.dias_ate_viagem as number) <= 30 && (card.dias_ate_viagem as number) >= 0) {
            indicators.push({ type: 'trip_soon', label: `Viagem em ${card.dias_ate_viagem} dias` })
        }

        // SLA estourado (mais de 7 dias na etapa)
        if ((card.tempo_etapa_dias as number) > 7) {
            indicators.push({ type: 'sla', label: `${card.tempo_etapa_dias} dias na etapa` })
        }

        // Sem tarefa programada
        if (!card.proxima_tarefa) {
            indicators.push({ type: 'no_task', label: 'Sem tarefa programada' })
        }

        return indicators
    }

    const bulkEditFields: BulkEditField[] = [
        {
            id: 'prioridade',
            label: 'Prioridade',
            type: 'select',
            options: [
                { label: 'Alta', value: 'alta' },
                { label: 'Média', value: 'media' },
                { label: 'Baixa', value: 'baixa' }
            ]
        },
        { id: 'data_viagem_inicio', label: 'Data da Viagem', type: 'date' },
        {
            id: 'dono_atual_id',
            label: 'Responsável',
            type: 'select',
            options: (filterOptions?.profiles || []).map(p => ({
                label: p.full_name || p.email || 'Sem nome',
                value: p.id
            }))
        },
        {
            id: 'etapa_id',
            label: 'Etapa',
            type: 'select',
            options: (stages || []).map(s => ({
                label: s.nome,
                value: s.id
            }))
        }
    ]

    return (
        <div className="space-y-4 mx-6 mb-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2 h-9">
                    <BulkActions
                        selectedCount={selectedCards.length}
                        onClearSelection={() => setSelectedCards([])}
                        actions={[
                            {
                                label: 'Editar',
                                icon: Edit,
                                onClick: () => setShowEditModal(true),
                                variant: 'outline'
                            },
                            {
                                label: 'Excluir',
                                icon: Trash2,
                                onClick: handleBulkDelete,
                                variant: 'destructive'
                            }
                        ]}
                    />
                </div>
                <ColumnToggle
                    columns={columnsConfig}
                    onToggle={handleColumnToggle}
                />
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Filtros:</span>
                <button
                    onClick={() => toggleQuickFilter('overdue')}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        activeQuickFilters.includes('overdue')
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                >
                    <span className="relative flex h-2 w-2">
                        <span className={cn("absolute inline-flex h-full w-full rounded-full bg-red-400", activeQuickFilters.includes('overdue') && "animate-ping opacity-75")}></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                    </span>
                    Atrasados
                    <span className={cn(
                        "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                        activeQuickFilters.includes('overdue') ? "bg-red-200" : "bg-gray-200"
                    )}>
                        {quickFilterCounts.overdue}
                    </span>
                </button>

                <button
                    onClick={() => toggleQuickFilter('trip_soon')}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        activeQuickFilters.includes('trip_soon')
                            ? "bg-orange-100 text-orange-700 border border-orange-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                >
                    <Plane className="h-3 w-3" />
                    Viagem Proxima
                    <span className={cn(
                        "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                        activeQuickFilters.includes('trip_soon') ? "bg-orange-200" : "bg-gray-200"
                    )}>
                        {quickFilterCounts.trip_soon}
                    </span>
                </button>

                <button
                    onClick={() => toggleQuickFilter('sla')}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        activeQuickFilters.includes('sla')
                            ? "bg-amber-100 text-amber-700 border border-amber-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                >
                    <AlertTriangle className="h-3 w-3" />
                    SLA Estourado
                    <span className={cn(
                        "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                        activeQuickFilters.includes('sla') ? "bg-amber-200" : "bg-gray-200"
                    )}>
                        {quickFilterCounts.sla}
                    </span>
                </button>

                <button
                    onClick={() => toggleQuickFilter('no_task')}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        activeQuickFilters.includes('no_task')
                            ? "bg-gray-200 text-gray-700 border border-gray-300"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                >
                    <Clock className="h-3 w-3" />
                    Sem Tarefa
                    <span className={cn(
                        "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                        activeQuickFilters.includes('no_task') ? "bg-gray-300" : "bg-gray-200"
                    )}>
                        {quickFilterCounts.no_task}
                    </span>
                </button>

                <button
                    onClick={() => toggleQuickFilter('high_priority')}
                    className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                        activeQuickFilters.includes('high_priority')
                            ? "bg-rose-100 text-rose-700 border border-rose-200"
                            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                    )}
                >
                    <AlertCircle className="h-3 w-3" />
                    Alta Prioridade
                    <span className={cn(
                        "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px]",
                        activeQuickFilters.includes('high_priority') ? "bg-rose-200" : "bg-gray-200"
                    )}>
                        {quickFilterCounts.high_priority}
                    </span>
                </button>

                {activeQuickFilters.length > 0 && (
                    <button
                        onClick={() => setActiveQuickFilters([])}
                        className="text-xs text-gray-500 hover:text-gray-700 underline ml-2"
                    >
                        Limpar filtros
                    </button>
                )}

                {/* Results count */}
                <span className="ml-auto text-xs text-gray-500">
                    {sortedCards.length} de {cards?.length ?? 0} cards
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 font-medium">Total Valor</div>
                    <div className="text-lg font-semibold text-gray-900 mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(
                            sortedCards.reduce((sum, c) => sum + (c.valor_estimado || 0), 0)
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 font-medium">Cards Atrasados</div>
                    <div className="text-lg font-semibold text-red-600 mt-1">
                        {sortedCards.filter(c => (c.tarefas_atrasadas as number) > 0).length}
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 font-medium">Prioridade Alta</div>
                    <div className="text-lg font-semibold text-amber-600 mt-1">
                        {sortedCards.filter(c => c.prioridade === 'alta').length}
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="text-xs text-gray-500 font-medium">Viagem Proxima</div>
                    <div className="text-lg font-semibold text-orange-600 mt-1">
                        {sortedCards.filter(c => c.dias_ate_viagem !== null && (c.dias_ate_viagem as number) <= 30 && (c.dias_ate_viagem as number) >= 0).length}
                    </div>
                </div>
            </div>

            <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="max-h-[calc(100vh-350px)] overflow-auto">
                <Table>
                    <TableHeader className="bg-gray-50/50 sticky top-0 z-10">
                        <TableRow>
                            <TableHead className="w-[40px] px-4">
                                <Checkbox
                                    checked={cards && cards.length > 0 && selectedCards.length === cards.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>

                            {visibleColumns.atencao && (
                                <TableHead className="w-[80px] text-center">
                                    <span className="sr-only">Atenção</span>
                                </TableHead>
                            )}

                            {visibleColumns.titulo && (
                                <TableHead className="w-[300px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('titulo')}>
                                    <div className="flex items-center gap-1">
                                        Negócio / Cliente
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.etapa_nome && (
                                <TableHead className="w-[150px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('etapa_nome')}>
                                    <div className="flex items-center gap-1">
                                        Etapa
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.valor_estimado && (
                                <TableHead className="w-[120px] text-right cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('valor_estimado')}>
                                    <div className="flex items-center justify-end gap-1">
                                        Valor
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.prioridade && (
                                <TableHead className="w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('prioridade')}>
                                    <div className="flex items-center gap-1">
                                        Prioridade
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.proxima_tarefa && (
                                <TableHead className="w-[200px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('proxima_tarefa')}>
                                    <div className="flex items-center gap-1">
                                        Próxima Tarefa
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.dono_atual_nome && (
                                <TableHead className="w-[150px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('dono_atual_nome')}>
                                    <div className="flex items-center gap-1">
                                        Responsável
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.data_viagem_inicio && (
                                <TableHead className="w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('data_viagem_inicio')}>
                                    <div className="flex items-center gap-1">
                                        Data Viagem
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.created_at && (
                                <TableHead className="w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('created_at')}>
                                    <div className="flex items-center gap-1">
                                        Criação
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.updated_at && (
                                <TableHead className="w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('updated_at')}>
                                    <div className="flex items-center gap-1">
                                        Atualização
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.origem && (
                                <TableHead className="w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('origem')}>
                                    <div className="flex items-center gap-1">
                                        Origem
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.produto && (
                                <TableHead className="w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('produto')}>
                                    <div className="flex items-center gap-1">
                                        Produto
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.sdr_nome && (
                                <TableHead className="w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('sdr_nome')}>
                                    <div className="flex items-center gap-1">
                                        SDR
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.vendas_nome && (
                                <TableHead className="w-[120px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('vendas_nome')}>
                                    <div className="flex items-center gap-1">
                                        Closer
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.tempo_etapa_dias && (
                                <TableHead className="w-[100px] cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('tempo_etapa_dias')}>
                                    <div className="flex items-center gap-1">
                                        Dias Etapa
                                        <ArrowUpDown className="h-3 w-3 text-gray-400" />
                                    </div>
                                </TableHead>
                            )}

                            {visibleColumns.acoes && (
                                <TableHead className="w-[60px] text-center">
                                    <span className="sr-only">Ações</span>
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedCards.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                                    Nenhum card encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedCards.map((card) => {
                                const hasOverdueTasks = (card.tarefas_atrasadas as number) > 0
                                const hasTripSoon = card.dias_ate_viagem !== null && (card.dias_ate_viagem as number) <= 30 && (card.dias_ate_viagem as number) >= 0

                                return (
                                <TableRow
                                    key={card.id}
                                    className={cn(
                                        "hover:bg-gray-50/50 transition-colors group",
                                        hasOverdueTasks && "bg-red-50/30 hover:bg-red-50/50",
                                        !hasOverdueTasks && hasTripSoon && "bg-orange-50/30 hover:bg-orange-50/50"
                                    )}
                                >
                                    <TableCell className="px-4">
                                        <Checkbox
                                            checked={selectedCards.includes(card.id!)}
                                            onCheckedChange={(checked) => handleSelectRow(card.id!, checked as boolean)}
                                        />
                                    </TableCell>

                                    {visibleColumns.atencao && (
                                        <TableCell className="text-center">
                                            {(() => {
                                                const indicators = getAttentionIndicators(card)
                                                if (indicators.length === 0) return null

                                                return (
                                                    <div className="flex items-center justify-center gap-1" title={indicators.map(i => i.label).join('\n')}>
                                                        {indicators.some(i => i.type === 'overdue') && (
                                                            <span className="relative flex h-2.5 w-2.5">
                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                                            </span>
                                                        )}
                                                        {indicators.some(i => i.type === 'trip_soon') && (
                                                            <Plane className="h-3.5 w-3.5 text-orange-500" />
                                                        )}
                                                        {indicators.some(i => i.type === 'sla') && (
                                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                                        )}
                                                        {indicators.some(i => i.type === 'no_task') && !indicators.some(i => i.type === 'overdue') && (
                                                            <span className="h-2 w-2 rounded-full bg-gray-300"></span>
                                                        )}
                                                    </div>
                                                )
                                            })()}
                                        </TableCell>
                                    )}

                                    {visibleColumns.titulo && (
                                        <TableCell className="font-medium">
                                            <div className="flex flex-col">
                                                <a href={`/cards/${card.id}`} className="text-gray-900 hover:text-primary hover:underline decoration-primary/30 underline-offset-2 transition-all font-semibold">
                                                    {card.titulo}
                                                </a>
                                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <UserIcon className="h-3 w-3" />
                                                    {card.pessoa_nome || 'Sem cliente'}
                                                </span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {visibleColumns.etapa_nome && (
                                        <TableCell>
                                            <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200 font-normal">
                                                {card.etapa_nome}
                                            </Badge>
                                        </TableCell>
                                    )}

                                    {visibleColumns.valor_estimado && (
                                        <TableCell className="text-right font-mono text-gray-700">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_estimado || 0)}
                                        </TableCell>
                                    )}

                                    {visibleColumns.prioridade && (
                                        <TableCell>
                                            {card.prioridade === 'alta' && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200">Alta</Badge>}
                                            {card.prioridade === 'media' && <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200">Média</Badge>}
                                            {card.prioridade === 'baixa' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200">Baixa</Badge>}
                                        </TableCell>
                                    )}

                                    {visibleColumns.proxima_tarefa && (
                                        <TableCell>
                                            {card.proxima_tarefa ? (
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="flex items-center gap-2 group/task">
                                                                {/* Botão de concluir */}
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault()
                                                                        e.stopPropagation()
                                                                        completeTaskMutation.mutate((card.proxima_tarefa as any).id)
                                                                    }}
                                                                    disabled={completeTaskMutation.isPending}
                                                                    className="opacity-0 group-hover/task:opacity-100 transition-opacity p-1 rounded hover:bg-green-100"
                                                                    title="Marcar como concluída"
                                                                >
                                                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                                                </button>
                                                                <div className="flex flex-col text-sm">
                                                                    <span className={cn(
                                                                        "font-medium flex items-center gap-1.5",
                                                                        new Date((card.proxima_tarefa as any).data_vencimento) < new Date() ? "text-red-600" : "text-gray-700"
                                                                    )}>
                                                                        {/* Ícone baseado no tipo */}
                                                                        {(card.proxima_tarefa as any).tipo === 'ligacao' && <Phone className="h-3.5 w-3.5" />}
                                                                        {(card.proxima_tarefa as any).tipo === 'email' && <Mail className="h-3.5 w-3.5" />}
                                                                        {(card.proxima_tarefa as any).tipo === 'reuniao' && <Calendar className="h-3.5 w-3.5" />}
                                                                        {!(card.proxima_tarefa as any).tipo && (
                                                                            new Date((card.proxima_tarefa as any).data_vencimento) < new Date()
                                                                                ? <AlertCircle className="h-3.5 w-3.5" />
                                                                                : <Clock className="h-3.5 w-3.5" />
                                                                        )}
                                                                        {format(new Date((card.proxima_tarefa as any).data_vencimento), "dd/MM HH:mm", { locale: ptBR })}
                                                                    </span>
                                                                    <span className="text-xs text-gray-500 truncate max-w-[150px]">
                                                                        {(card.proxima_tarefa as any).titulo}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent side="top" className="max-w-xs">
                                                            <div className="text-xs space-y-1">
                                                                <p className="font-medium">{(card.proxima_tarefa as any).titulo}</p>
                                                                <p className="text-gray-400">
                                                                    Tipo: {(card.proxima_tarefa as any).tipo || 'Tarefa'}
                                                                </p>
                                                                <p className="text-gray-400">
                                                                    Vencimento: {format(new Date((card.proxima_tarefa as any).data_vencimento), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                                </p>
                                                            </div>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Sem tarefas</span>
                                            )}
                                        </TableCell>
                                    )}

                                    {visibleColumns.dono_atual_nome && (
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarFallback className="text-[10px] bg-blue-50 text-blue-700">
                                                        {card.dono_atual_nome?.substring(0, 2).toUpperCase() || 'U'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="text-sm text-gray-600 truncate max-w-[100px]">
                                                    {card.dono_atual_nome?.split(' ')[0]}
                                                </span>
                                            </div>
                                        </TableCell>
                                    )}

                                    {visibleColumns.data_viagem_inicio && (
                                        <TableCell>
                                            {card.data_viagem_inicio ? (
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                    <span>{format(new Date(card.data_viagem_inicio), "dd/MM/yy")}</span>
                                                </div>
                                            ) : '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.created_at && (
                                        <TableCell className="text-gray-600 text-xs">
                                            {card.created_at ? format(new Date(card.created_at), "dd/MM/yy HH:mm") : '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.updated_at && (
                                        <TableCell className="text-gray-600 text-xs">
                                            {card.updated_at ? format(new Date(card.updated_at), "dd/MM/yy HH:mm") : '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.origem && (
                                        <TableCell className="text-gray-600 text-sm capitalize">
                                            {card.origem || '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.produto && (
                                        <TableCell className="text-gray-600 text-sm capitalize">
                                            {card.produto || '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.sdr_nome && (
                                        <TableCell className="text-gray-600 text-sm">
                                            {card.sdr_nome?.split(' ')[0] || '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.vendas_nome && (
                                        <TableCell className="text-gray-600 text-sm">
                                            {card.vendas_nome?.split(' ')[0] || '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.tempo_etapa_dias && (
                                        <TableCell className="text-gray-600 text-sm text-center">
                                            {card.tempo_etapa_dias !== null ? (
                                                <Badge variant="outline" className={cn(
                                                    "font-mono",
                                                    (card.tempo_etapa_dias || 0) > 7 ? "text-red-600 border-red-200 bg-red-50" : "text-gray-600"
                                                )}>
                                                    {card.tempo_etapa_dias}d
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                    )}

                                    {visibleColumns.acoes && (
                                        <TableCell className="text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Ações</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    {/* Contato */}
                                                    {(card as any).pessoa_telefone && (
                                                        <DropdownMenuItem asChild>
                                                            <a
                                                                href={`https://wa.me/${((card as any).pessoa_telefone as string).replace(/\D/g, '')}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Phone className="h-4 w-4 text-green-600" />
                                                                WhatsApp
                                                            </a>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {(card as any).pessoa_email && (
                                                        <DropdownMenuItem asChild>
                                                            <a
                                                                href={`mailto:${(card as any).pessoa_email}`}
                                                                className="flex items-center gap-2"
                                                            >
                                                                <Mail className="h-4 w-4 text-blue-600" />
                                                                Enviar Email
                                                            </a>
                                                        </DropdownMenuItem>
                                                    )}
                                                    {((card as any).pessoa_telefone || (card as any).pessoa_email) && <DropdownMenuSeparator />}

                                                    {/* Ver detalhes */}
                                                    <DropdownMenuItem asChild>
                                                        <a
                                                            href={`/cards/${card.id}`}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <ArrowUpDown className="h-4 w-4" />
                                                            Ver Detalhes
                                                        </a>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    )}
                                </TableRow>
                            )})
                        )}
                    </TableBody>
                </Table>
                </div>
            </div>

            <DeleteCardModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmBulkDelete}
                isLoading={isDeleting}
                cardTitle={`${selectedCards.length} cards selecionados`}
            />

            <BulkEditModal
                isOpen={showEditModal}
                onClose={() => setShowEditModal(false)}
                onConfirm={handleBulkEdit}
                selectedCount={selectedCards.length}
                fields={bulkEditFields}
            />
        </div>
    )
}
