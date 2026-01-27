import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowUpDown, Calendar, Clock, AlertCircle, User as UserIcon, Trash2, Edit } from 'lucide-react'
import { usePipelineCards } from '../../hooks/usePipelineCards'
import { usePipelineFilters, type ViewMode, type SubView, type FilterState } from '../../hooks/usePipelineFilters'
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
import { useQueryClient } from '@tanstack/react-query'

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

    // --- State ---
    const [sortField, setSortField] = useState<keyof Card | 'proxima_tarefa'>('created_at')
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
    const [selectedCards, setSelectedCards] = useState<string[]>([])
    const [visibleColumns, setVisibleColumns] = useState({
        select: true,
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
        tempo_etapa_dias: false
    })
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const { softDelete, isDeleting } = useDeleteCard()

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
            const updates: any = {}

            if (fieldId === 'data_viagem_inicio') {
                updates.data_viagem_inicio = value
            } else if (fieldId === 'prioridade') {
                updates.prioridade = value
            }
            // Add more fields as needed (e.g. stage, owner requires more complex logic/IDs)

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

    // --- Sorting Logic (Client-side for now as API sort is basic) ---
    const sortedCards = [...(cards || [])].sort((a, b) => {
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
    ]

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
        { id: 'data_viagem_inicio', label: 'Data da Viagem', type: 'date' }
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

            <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-gray-50/50">
                        <TableRow>
                            <TableHead className="w-[40px] px-4">
                                <Checkbox
                                    checked={cards && cards.length > 0 && selectedCards.length === cards.length}
                                    onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                                />
                            </TableHead>

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
                            sortedCards.map((card) => (
                                <TableRow key={card.id} className="hover:bg-gray-50/50 transition-colors group">
                                    <TableCell className="px-4">
                                        <Checkbox
                                            checked={selectedCards.includes(card.id!)}
                                            onCheckedChange={(checked) => handleSelectRow(card.id!, checked as boolean)}
                                        />
                                    </TableCell>

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
                                                <div className="flex flex-col text-sm">
                                                    <span className={cn(
                                                        "font-medium flex items-center gap-1.5",
                                                        new Date((card.proxima_tarefa as any).data_vencimento) < new Date() ? "text-red-600" : "text-gray-700"
                                                    )}>
                                                        {new Date((card.proxima_tarefa as any).data_vencimento) < new Date() ? <AlertCircle className="h-3.5 w-3.5" /> : <Clock className="h-3.5 w-3.5" />}
                                                        {format(new Date((card.proxima_tarefa as any).data_vencimento), "dd/MM HH:mm", { locale: ptBR })}
                                                    </span>
                                                    <span className="text-xs text-gray-500 truncate max-w-[180px]">
                                                        {(card.proxima_tarefa as any).titulo}
                                                    </span>
                                                </div>
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
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
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
