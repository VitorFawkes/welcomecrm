import { cn } from '../../lib/utils'

interface KanbanCollapsedPhaseProps {
    phaseName: string
    totalCount: number
    totalValue: number
    onClick: () => void
    onDragOver?: () => void
}

export default function KanbanCollapsedPhase({
    phaseName,
    totalValue,
    onClick,
    onDragOver
}: KanbanCollapsedPhaseProps) {
    // Phase color mapping - Consistent with KanbanColumn
    const phaseColors: Record<string, string> = {
        'SDR': 'border-t-blue-500',
        'Planner': 'border-t-purple-500',
        'Pós-venda': 'border-t-green-500',
        'Outro': 'border-t-gray-500'
    };

    const borderColor = phaseColors[phaseName || 'Outro'];

    return (
        <div
            onClick={onClick}
            onDragOver={(e) => {
                e.preventDefault() // Allow drop/hover detection
                onDragOver?.()
            }}
            className={cn(
                "group relative flex h-full w-48 flex-col items-center justify-end pb-24", // Increased width to w-48 to match parent
                "cursor-pointer transition-all duration-300 ease-in-out",
                "bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md hover:bg-white", // Solid background
                "rounded-xl border-t-4", borderColor // Colored top border
            )}
        >
            {/* Removed internal Header (Name/Count) as it's now in PhaseGroup */}

            {/* Bottom: Total Value */}
            <div className="flex flex-col items-center gap-1 w-full px-1">
                <div className="flex flex-col items-center justify-center w-full rounded-lg bg-white border border-gray-100 py-2 shadow-sm group-hover:shadow-md transition-all">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Total</span>
                    <span className="text-[10px] font-bold text-emerald-600">
                        {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                            notation: 'compact',
                            maximumFractionDigits: 1
                        }).format(totalValue)}
                    </span>
                </div>
            </div>
        </div>
    )
}
