import { useState } from 'react'
import {
    useMyLibraryItems,
    useDeleteLibraryItem,
    LIBRARY_CATEGORY_CONFIG,
    type LibraryCategory,
    type LibraryItem
} from '@/hooks/useLibrary'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LibraryItemForm } from '@/components/proposals/LibraryItemForm'
import {
    Search,
    Plus,
    MoreVertical,
    Pencil,
    Trash2,
    Loader2,
    Package,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function LibraryManager() {
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<LibraryCategory | 'all'>('all')
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<LibraryItem | null>(null)

    const { data: items = [], isLoading } = useMyLibraryItems(
        selectedCategory === 'all' ? undefined : selectedCategory
    )
    const deleteItem = useDeleteLibraryItem()

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        ((item.content as any)?.description || '').toLowerCase().includes(search.toLowerCase())
    )

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este item?')) return
        try {
            await deleteItem.mutateAsync(id)
            toast.success('Item excluído com sucesso')
        } catch (error) {
            console.error('Error deleting item:', error)
            toast.error('Erro ao excluir item')
        }
    }

    const formatCurrency = (value: number | null) => {
        if (value === null) return '-'
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 flex-1 max-w-lg">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar itens..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 bg-white"
                        />
                    </div>
                    <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200">
                        <button
                            onClick={() => setSelectedCategory('all')}
                            className={cn(
                                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                                selectedCategory === 'all'
                                    ? 'bg-slate-100 text-slate-900'
                                    : 'text-slate-500 hover:bg-slate-50'
                            )}
                        >
                            Todos
                        </button>
                        {Object.entries(LIBRARY_CATEGORY_CONFIG).map(([key, config]) => {
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedCategory(key as LibraryCategory)}
                                    className={cn(
                                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1',
                                        selectedCategory === key
                                            ? 'bg-slate-100 text-slate-900'
                                            : 'text-slate-500 hover:bg-slate-50'
                                    )}
                                    title={config.label}
                                >
                                    {/* Icon would go here if we imported them dynamically */}
                                    {config.label}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Item
                </Button>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
            ) : filteredItems.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                    <Package className="h-12 w-12 mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-900">Nenhum item encontrado</p>
                    <p className="text-sm mb-4">Crie itens reutilizáveis para suas propostas.</p>
                    <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
                        Criar Primeiro Item
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                    {filteredItems.map((item) => {
                        const config = LIBRARY_CATEGORY_CONFIG[item.category as LibraryCategory] || LIBRARY_CATEGORY_CONFIG.custom
                        return (
                            <div
                                key={item.id}
                                className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden flex flex-col"
                            >
                                <div className="p-4 flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={cn(
                                            "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                                            "bg-slate-100 text-slate-600"
                                        )}>
                                            {config.label}
                                        </span>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <MoreVertical className="h-4 w-4 text-slate-400" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditingItem(item)}>
                                                    <Pencil className="h-4 w-4 mr-2" />
                                                    Editar
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleDelete(item.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <h3 className="font-medium text-slate-900 mb-1 line-clamp-1" title={item.name}>
                                        {item.name}
                                    </h3>
                                    <p className="text-sm text-slate-500 line-clamp-2 mb-3 h-10">
                                        {(item.content as any)?.description || 'Sem descrição'}
                                    </p>

                                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50">
                                        <span className="text-xs text-slate-400">Preço Base</span>
                                        <span className="text-sm font-medium text-slate-900">
                                            {formatCurrency(item.base_price)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Modals */}
            <LibraryItemForm
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {editingItem && (
                <LibraryItemForm
                    isOpen={true}
                    onClose={() => setEditingItem(null)}
                    item={editingItem}
                />
            )}
        </div>
    )
}
