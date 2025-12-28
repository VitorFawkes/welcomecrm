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

    // Phase color mapping - Updated for Premium Look (Subtle borders)
    // Static color map for solid visibility
    const phaseColors: Record<string, string> = {
        'SDR': 'border-t-blue-500',
        'Planner': 'border-t-purple-500',
        'Pós-venda': 'border-t-green-500',
        'Outro': 'border-t-gray-500'
    };

    // Robust fallback logic
    const borderColor = phaseColors[stage.fase || 'Outro'];

    return (
        <div className={cn(
            "flex h-full w-80 min-w-[20rem] shrink-0 flex-col rounded-xl bg-gray-50 border border-gray-200 shadow-sm transition-all duration-300 hover:shadow-md hover:bg-white",
            "border-t-4", borderColor
        )}>
            {/* Header with White Strip */}
            <div className="bg-white border-b border-gray-200 p-4 rounded-t-xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-bold text-gray-800 tracking-tight">{stage.nome}</h3>
                    <span className="rounded-full bg-gray-100 border border-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                        {cards.length}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="h-1 w-12 rounded-full bg-primary/20"></div>
                    <p className="text-xs font-bold text-gray-400">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                    </p>
                </div>
            </div>

            <div
                ref={setNodeRef}
                className={cn(
                    "flex flex-1 flex-col gap-3 overflow-y-auto transition-colors scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent px-3 pt-3 pb-24", // Added pb-24 for footer clearance
                    isOver ? "bg-primary/5 rounded-lg ring-2 ring-primary/20 ring-inset" : ""
                )}
            >
                {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                        <div className="h-12 w-12 rounded-full bg-white/50 border-2 border-dashed border-gray-200 mb-2" />
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
