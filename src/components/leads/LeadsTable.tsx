import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ArrowUpDown, User as UserIcon, ExternalLink } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/Table'
import { Badge } from '../ui/Badge'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Checkbox } from '../ui/checkbox'
import { cn } from '../../lib/utils'
import type { LeadCard } from '../../hooks/useLeadsQuery'
import { useLeadsFilters, type SortBy } from '../../hooks/useLeadsFilters'

interface LeadsTableProps {
    leads: LeadCard[]
    selectedIds: string[]
    onSelectAll: (checked: boolean) => void
    onSelectRow: (id: string, checked: boolean) => void
    isLoading?: boolean
}

export default function LeadsTable({
    leads,
    selectedIds,
    onSelectAll,
    onSelectRow,
    isLoading
}: LeadsTableProps) {
    const { filters, setFilters } = useLeadsFilters()

    const handleSort = (field: SortBy) => {
        if (filters.sortBy === field) {
            setFilters({ sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc' })
        } else {
            setFilters({ sortBy: field, sortDirection: 'desc' })
        }
    }

    const SortableHeader = ({ field, children }: { field: SortBy, children: React.ReactNode }) => (
        <TableHead
            className="cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1">
                {children}
                <ArrowUpDown className={cn(
                    "h-3 w-3",
                    filters.sortBy === field ? "text-primary" : "text-gray-400"
                )} />
            </div>
        </TableHead>
    )

    if (isLoading) {
        return (
            <div className="p-8 text-center text-gray-500">
                Carregando leads...
            </div>
        )
    }

    if (leads.length === 0) {
        return (
            <div className="p-12 text-center">
                <div className="text-gray-400 text-lg mb-2">Nenhum lead encontrado</div>
                <p className="text-gray-500 text-sm">Ajuste os filtros ou aguarde novos leads</p>
            </div>
        )
    }

    const allSelected = leads.length > 0 && selectedIds.length === leads.length
    const someSelected = selectedIds.length > 0 && selectedIds.length < leads.length

    return (
        <div className="rounded-md border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="w-[40px] px-4">
                            <Checkbox
                                checked={allSelected}
                                ref={(el) => {
                                    if (el) (el as any).indeterminate = someSelected
                                }}
                                onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                            />
                        </TableHead>
                        <SortableHeader field="titulo">Negócio / Cliente</SortableHeader>
                        <TableHead className="w-[150px]">Etapa</TableHead>
                        <SortableHeader field="valor_estimado">Valor</SortableHeader>
                        <TableHead className="w-[100px]">Prioridade</TableHead>
                        <TableHead className="w-[150px]">Responsável</TableHead>
                        <SortableHeader field="created_at">Criado em</SortableHeader>
                        <SortableHeader field="updated_at">Atualizado</SortableHeader>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {leads.map((lead) => (
                        <TableRow
                            key={lead.id}
                            className={cn(
                                "hover:bg-gray-50/50 transition-colors",
                                selectedIds.includes(lead.id!) && "bg-primary/5"
                            )}
                        >
                            <TableCell className="px-4">
                                <Checkbox
                                    checked={selectedIds.includes(lead.id!)}
                                    onCheckedChange={(checked) => onSelectRow(lead.id!, checked as boolean)}
                                />
                            </TableCell>

                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span className="text-gray-900 font-semibold truncate max-w-[250px]">
                                        {lead.titulo}
                                    </span>
                                    <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                        <UserIcon className="h-3 w-3" />
                                        {lead.pessoa_nome || 'Sem cliente'}
                                    </span>
                                </div>
                            </TableCell>

                            <TableCell>
                                <Badge
                                    variant="secondary"
                                    className="text-xs font-normal bg-gray-100 text-gray-600 border-gray-200"
                                >
                                    {lead.etapa_nome}
                                </Badge>
                            </TableCell>

                            <TableCell className="text-right font-mono text-gray-700">
                                {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                }).format(lead.valor_estimado || 0)}
                            </TableCell>

                            <TableCell>
                                {lead.prioridade === 'alta' && (
                                    <Badge className="bg-red-100 text-red-700 border-red-200">Alta</Badge>
                                )}
                                {lead.prioridade === 'media' && (
                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Média</Badge>
                                )}
                                {lead.prioridade === 'baixa' && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200">Baixa</Badge>
                                )}
                                {!lead.prioridade && (
                                    <span className="text-gray-400 text-xs">-</span>
                                )}
                            </TableCell>

                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-[10px] bg-blue-50 text-blue-700">
                                            {lead.dono_atual_nome?.substring(0, 2).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-gray-600 truncate max-w-[100px]">
                                        {lead.dono_atual_nome?.split(' ')[0] || 'Sem dono'}
                                    </span>
                                </div>
                            </TableCell>

                            <TableCell className="text-gray-600 text-sm">
                                {lead.created_at
                                    ? format(new Date(lead.created_at), "dd/MM/yy", { locale: ptBR })
                                    : '-'}
                            </TableCell>

                            <TableCell className="text-gray-600 text-sm">
                                {lead.updated_at
                                    ? format(new Date(lead.updated_at), "dd/MM/yy HH:mm", { locale: ptBR })
                                    : '-'}
                            </TableCell>

                            <TableCell>
                                {lead.status_comercial === 'ganho' && (
                                    <Badge className="bg-green-100 text-green-700 border-green-200">Ganho</Badge>
                                )}
                                {lead.status_comercial === 'perdido' && (
                                    <Badge className="bg-red-100 text-red-700 border-red-200">Perdido</Badge>
                                )}
                                {lead.status_comercial === 'aberto' && (
                                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">Aberto</Badge>
                                )}
                                {!lead.status_comercial && (
                                    <Badge variant="outline">-</Badge>
                                )}
                            </TableCell>

                            <TableCell>
                                <a
                                    href={`/cards/${lead.id}`}
                                    className="text-gray-400 hover:text-primary transition-colors"
                                    title="Abrir lead"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
