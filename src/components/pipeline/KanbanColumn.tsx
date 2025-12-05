import { useDroppable } from '@dnd-kit/core'
import { cn } from '../../lib/utils'
import KanbanCard from './KanbanCard'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']
type Stage = Database['public']['Tables']['pipeline_stages']['Row']

interface KanbanColumnProps {
    stage: Stage
    cards: Card[]
}

export default function KanbanColumn({ stage, cards }: KanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({
        id: stage.id,
        data: stage
    })

    const totalValue = cards.reduce((acc, card) => acc + (card.valor_estimado || 0), 0)

    // Phase color mapping
    const phaseColors = {
        'SDR': 'border-t-blue-500 bg-blue-50/30',
        'Planner': 'border-t-purple-500 bg-purple-50/30',
        'Pós-venda': 'border-t-green-500 bg-green-50/30',
        'Outro': 'border-t-gray-500 bg-gray-50/30'
    }

    const phaseBadgeColors = {
        'SDR': 'bg-blue-100 text-blue-700 border-blue-200',
        'Planner': 'bg-purple-100 text-purple-700 border-purple-200',
        'Pós-venda': 'bg-green-100 text-green-700 border-green-200',
        'Outro': 'bg-gray-100 text-gray-700 border-gray-200'
    }

    const phaseColor = phaseColors[stage.fase] || phaseColors['Outro']
    const phaseBadgeColor = phaseBadgeColors[stage.fase] || phaseBadgeColors['Outro']

    return (
        <div className={cn(
            "flex h-full w-80 min-w-[20rem] flex-col rounded-lg bg-muted border border-border shadow-sm p-4 border-t-4",
            phaseColor
        )}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{stage.nome}</h3>
                <span className="rounded-full bg-primary-light px-2 py-1 text-xs font-medium text-primary">
                    {cards.length}
                </span>
            </div>

            {/* Phase badge */}
            <div className="mb-3">
                <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border",
                    phaseBadgeColor
                )}>
                    {stage.fase}
                </span>
            </div>

            <p className="text-sm text-gray-500 mb-4">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </p>

            <div
                ref={setNodeRef}
                className={cn(
                    "flex flex-1 flex-col gap-4 overflow-y-auto transition-colors scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent pr-1",
                    isOver ? "bg-primary-light/30 rounded-lg" : ""
                )}
            >
                {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                        <div className="h-12 w-12 rounded-full bg-white border-2 border-dashed border-gray-200 mb-2" />
                        <p className="text-xs text-gray-400 font-medium">Vazio</p>
                    </div>
                ) : (
                    cards.map((card) => (
                        <KanbanCard key={card.id} card={card} />
                    ))
                )}
            </div>
        </div>
    )
}
