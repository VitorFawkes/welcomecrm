import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Trash2, RotateCcw, Calendar, User, DollarSign, Loader2, AlertCircle, Package } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useDeleteCard } from '../../hooks/useDeleteCard'
import { cn } from '../../lib/utils'

interface DeletedCard {
    id: string
    titulo: string
    produto: string
    status_comercial: string
    valor_estimado: number | null
    deleted_at: string
    deleted_by: string | null
    deleted_by_nome: string | null
    pessoa_nome: string | null
    etapa_nome: string | null
    created_at: string
}

export default function Lixeira() {
    const { restore, isRestoring } = useDeleteCard()

    const { data: deletedCards, isLoading, error } = useQuery({
        queryKey: ['deleted-cards'],
        queryFn: async () => {
            const { data, error } = await (supabase
                .from('view_deleted_cards' as any) as any)
                .select('*')
                .order('deleted_at', { ascending: false })

            if (error) throw error
            return data as DeletedCard[]
        }
    })

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const productColors: Record<string, string> = {
        'TRIPS': 'bg-blue-50 text-blue-700 border-blue-200',
        'WEDDING': 'bg-pink-50 text-pink-700 border-pink-200',
        'CORP': 'bg-purple-50 text-purple-700 border-purple-200'
    }

    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="flex-none bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                        <Trash2 className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">Lixeira</h1>
                        <p className="text-sm text-gray-500">
                            Cards de viagem excluídos que podem ser restaurados
                        </p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-red-500">
                        <AlertCircle className="h-12 w-12 mb-2" />
                        <p>Erro ao carregar cards deletados</p>
                        <p className="text-sm text-gray-500 mt-1">
                            A view pode ainda não existir. Aplique a migração primeiro.
                        </p>
                    </div>
                ) : !deletedCards?.length ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <Trash2 className="h-16 w-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium text-gray-500">Lixeira vazia</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Cards excluídos aparecerão aqui
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-4 max-w-4xl mx-auto">
                        {deletedCards.map((card) => (
                            <div
                                key={card.id}
                                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        {/* Product Badge & Title */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                                productColors[card.produto] || 'bg-gray-50 text-gray-700 border-gray-200'
                                            )}>
                                                {card.produto}
                                            </span>
                                            {card.status_comercial && (
                                                <span className="text-xs text-gray-400">
                                                    • {card.status_comercial}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {card.titulo}
                                        </h3>

                                        {/* Metadata */}
                                        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                                            {card.pessoa_nome && (
                                                <span className="flex items-center gap-1">
                                                    <User className="h-3.5 w-3.5" />
                                                    {card.pessoa_nome}
                                                </span>
                                            )}
                                            {card.valor_estimado && (
                                                <span className="flex items-center gap-1 text-gray-700 font-medium">
                                                    <DollarSign className="h-3.5 w-3.5" />
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_estimado)}
                                                </span>
                                            )}
                                            {card.etapa_nome && (
                                                <span className="flex items-center gap-1">
                                                    <Package className="h-3.5 w-3.5" />
                                                    {card.etapa_nome}
                                                </span>
                                            )}
                                        </div>

                                        {/* Deletion Info */}
                                        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>
                                                Excluído em {formatDate(card.deleted_at)}
                                                {card.deleted_by_nome && ` por ${card.deleted_by_nome}`}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Restore Button */}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => restore(card.id)}
                                        disabled={isRestoring}
                                        className="gap-2 shrink-0"
                                    >
                                        {isRestoring ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-4 w-4" />
                                        )}
                                        Restaurar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>

    )
}
