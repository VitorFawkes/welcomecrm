import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Calendar, DollarSign, MapPin, Users, CheckSquare, AlertCircle, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface KanbanCardProps {
    card: Card
}

// Mock SLA Config (In minutes) - Should come from DB 'slas' table
const SLA_CONFIG: Record<string, number> = {
    'Novo Lead': 120, // 2 hours
    'Qualificação': 1440, // 24 hours
    'Negociação': 2880, // 48 hours
}

export default function KanbanCard({ card }: KanbanCardProps) {
    const navigate = useNavigate()
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: card.id!,
        data: card
    })

    const style = {
        transform: CSS.Translate.toString(transform),
    }

    const handleClick = () => {
        if (!isDragging) {
            navigate(`/cards/${card.id}`)
        }
    }

    // Fetch field settings for this phase
    const { data: settings } = useQuery({
        queryKey: ['pipeline-settings', card.fase],
        queryFn: async () => {
            if (!card.fase) return null
            const { data, error } = await supabase
                .from('pipeline_card_settings')
                .select('campos_kanban, ordem_kanban')
                .eq('fase', card.fase)
                .is('usuario_id', null)
                .single()

            if (error) return null
            return data
        },
        enabled: !!card.fase
    })

    const renderDynamicField = (fieldId: string) => {
        // Handle top-level fields first
        switch (fieldId) {
            case 'data_viagem_inicio':
                if (!card.data_viagem_inicio) return null
                return (
                    <div key={fieldId} className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                        <span>{new Date(card.data_viagem_inicio).toLocaleDateString('pt-BR')}</span>
                    </div>
                )
            case 'valor_estimado':
                if (!card.valor_estimado) return null
                return (
                    <div key={fieldId} className="flex items-center text-xs text-gray-500 mt-1">
                        <DollarSign className="mr-1.5 h-3 w-3 flex-shrink-0" />
                        <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_estimado)}</span>
                    </div>
                )
            case 'prioridade':
                if (!card.prioridade) return null
                const priorityColors: Record<string, string> = {
                    alta: 'text-red-700 bg-red-50',
                    media: 'text-yellow-700 bg-yellow-50',
                    baixa: 'text-green-700 bg-green-50'
                }
                const priorityLabels: Record<string, string> = {
                    alta: 'Alta Prioridade',
                    media: 'Média Prioridade',
                    baixa: 'Baixa Prioridade'
                }
                return (
                    <div key={fieldId} className="mt-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityColors[card.prioridade] || 'text-gray-500'}`}>
                            {priorityLabels[card.prioridade] || card.prioridade}
                        </span>
                    </div>
                )
            case 'created_at':
                if (!card.created_at) return null
                return (
                    <div key={fieldId} className="text-[10px] text-gray-400 mt-1">
                        Criado em {new Date(card.created_at).toLocaleDateString('pt-BR')}
                    </div>
                )
            case 'updated_at':
                if (!card.updated_at) return null
                return (
                    <div key={fieldId} className="text-[10px] text-gray-400 mt-1">
                        Atualizado em {new Date(card.updated_at).toLocaleDateString('pt-BR')}
                    </div>
                )
            case 'proxima_tarefa':
                if (!card.proxima_tarefa) return null
                const tarefa = card.proxima_tarefa as any
                const isLate = new Date(tarefa.data_vencimento) < new Date()
                return (
                    <div key={fieldId} className={cn(
                        "mt-2 flex items-start gap-2 rounded-md border p-2 text-xs",
                        isLate ? "border-red-100 bg-red-50" : "border-gray-100 bg-gray-50"
                    )}>
                        {isLate ? (
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 text-red-500" />
                        ) : (
                            <CheckSquare className="mt-0.5 h-3.5 w-3.5 text-blue-500" />
                        )}
                        <div className="flex-1 overflow-hidden">
                            <p className={cn("font-medium truncate", isLate ? "text-red-700" : "text-gray-700")}>
                                {tarefa.titulo}
                            </p>
                            <p className={cn("mt-0.5", isLate ? "text-red-600" : "text-gray-500")}>
                                {isLate ? 'Atrasada - ' : ''}
                                {new Date(tarefa.data_vencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                )
            case 'ultima_interacao':
                if (!card.ultima_interacao) return null
                const interacao = card.ultima_interacao as any
                return (
                    <div key={fieldId} className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-500">
                        <CheckSquare className="h-3 w-3 text-gray-400" />
                        <span className="truncate">
                            Última: {interacao.titulo} ({new Date(interacao.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })})
                        </span>
                    </div>
                )
        }

        // Handle product_data fields
        const data = card.produto_data as any
        if (!data) return null

        switch (fieldId) {
            case 'destinos':
                if (!data.destinos?.length) return null
                return (
                    <div key={fieldId} className="flex items-center text-xs text-gray-500 mt-1">
                        <MapPin className="mr-1.5 h-3 w-3 flex-shrink-0" />
                        <span className="truncate block flex-1">{data.destinos.join(', ')}</span>
                    </div>
                )
            case 'epoca_viagem':
                if (!data.epoca_viagem?.inicio) return null
                return (
                    <div key={fieldId} className="flex items-center text-xs text-gray-500 mt-1">
                        <Calendar className="mr-1.5 h-3 w-3 flex-shrink-0" />
                        <span className="truncate block flex-1">
                            {new Date(data.epoca_viagem.inicio).toLocaleDateString('pt-BR')}
                            {data.epoca_viagem.fim && ` - ${new Date(data.epoca_viagem.fim).toLocaleDateString('pt-BR')}`}
                        </span>
                    </div>
                )
            case 'pessoas':
                if (!data.pessoas) return null
                return (
                    <div key={fieldId} className="flex items-center text-xs text-gray-500 mt-1">
                        <Users className="mr-1.5 h-3 w-3 flex-shrink-0" />
                        <span className="truncate block flex-1">
                            {data.pessoas.adultos} Adt
                            {data.pessoas.criancas ? `, ${data.pessoas.criancas} Criança(s)` : ''}
                        </span>
                    </div>
                )
            case 'orcamento':
                if (!data.orcamento?.total) return null
                return (
                    <div key={fieldId} className="flex items-center text-xs text-gray-500 mt-1">
                        <DollarSign className="mr-1.5 h-3 w-3 flex-shrink-0" />
                        <span className="truncate block flex-1">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.orcamento.total)}
                        </span>
                    </div>
                )
            case 'taxa_planejamento':
                if (!data.taxa_planejamento?.status) return null
                const statusColors: Record<string, string> = {
                    pendente: 'text-yellow-600 bg-yellow-50',
                    paga: 'text-green-600 bg-green-50',
                    cortesia: 'text-blue-600 bg-blue-50',
                    nao_ativa: 'text-gray-400 bg-gray-50',
                    nao_aplicavel: 'text-gray-400 bg-gray-50'
                }
                const statusLabels: Record<string, string> = {
                    pendente: 'Taxa Pendente',
                    paga: 'Taxa Paga',
                    cortesia: 'Taxa Cortesia',
                    nao_ativa: 'Taxa Inativa',
                    nao_aplicavel: 'N/A'
                }
                const status = data.taxa_planejamento.status as string
                return (
                    <div key={fieldId} className="mt-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusColors[status] || 'text-gray-500'}`}>
                            {statusLabels[status] || status}
                        </span>
                    </div>
                )
            default:
                return null
        }
    }

    // Default fields if no settings found (fallback)
    const defaultFields = ['destinos', 'epoca_viagem', 'orcamento']
    const settingsAny = settings as any
    const fieldsToShow = (settingsAny?.campos_kanban as string[]) || defaultFields
    const orderedFields = (settingsAny?.ordem_kanban as string[]) || fieldsToShow

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            onClick={handleClick}
            className={cn(
                "group relative flex cursor-grab flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all duration-200 ease-out hover:shadow-md hover:border-gray-300 active:cursor-grabbing",
                isDragging && "opacity-0"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors",
                    card.produto === 'TRIPS' && "bg-product-trips/10 text-product-trips border border-product-trips/20",
                    card.produto === 'WEDDING' && "bg-product-wedding/10 text-product-wedding border border-product-wedding/20",
                    card.produto === 'CORP' && "bg-product-corp/10 text-product-corp border border-product-corp/20"
                )}>
                    {card.produto}
                </span>
                {card.prioridade === 'alta' && (
                    <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0 mt-1.5" title="Prioridade Alta" />
                )}
            </div>

            {/* SLA Badge */}
            {(() => {
                if (!card.tempo_etapa_dias || !card.etapa_nome) return null;
                const minutesInStage = card.tempo_etapa_dias * 24 * 60;
                const limit = SLA_CONFIG[card.etapa_nome] || 2880; // Default 48h
                const isBreached = minutesInStage > limit;

                if (isBreached) {
                    return (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100">
                            <Clock className="h-3 w-3" />
                            <span>ATRASADO ({Math.floor(card.tempo_etapa_dias)}d)</span>
                        </div>
                    );
                }
                return null;
            })()}

            <span className="line-clamp-2 text-sm font-medium text-gray-900 group-hover:text-blue-600">
                {card.titulo}
            </span>

            <div className="flex flex-col gap-0.5">
                {/* Always show product/value if available as header info */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    {card.valor_estimado && (
                        <span className="font-medium text-gray-700">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_estimado)}
                        </span>
                    )}
                </div>

                {/* Dynamic Fields */}
                {orderedFields.map(fieldId => renderDynamicField(fieldId))}

                {/* Owner info always at bottom */}
                <div className="mt-2 flex items-center justify-between border-t pt-2">
                    <div className="flex items-center gap-1.5">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-600">
                            {card.dono_atual_nome?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-500 truncate max-w-[80px]">
                            {card.dono_atual_nome?.split(' ')[0]}
                        </span>
                    </div>
                    {card.tarefas_pendentes ? (
                        <div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium bg-orange-50 px-1.5 py-0.5 rounded-full">
                            <AlertCircle className="h-3 w-3" />
                            {card.tarefas_pendentes}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
