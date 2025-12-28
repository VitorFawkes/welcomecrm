import { useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'
import KanbanCollapsedPhase from './KanbanCollapsedPhase'
import { ChevronLeft } from 'lucide-react'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']
type Stage = Database['public']['Tables']['pipeline_stages']['Row']

interface KanbanPhaseGroupProps {
    phaseName: string
    isCollapsed: boolean
    onToggle: () => void
    children: React.ReactNode
    totalCount: number
    totalValue: number
    stages: Stage[]
    cards: Card[]
}

export default function KanbanPhaseGroup({
    phaseName,
    isCollapsed,
    onToggle,
    children,
    totalCount,
    totalValue
}: KanbanPhaseGroupProps) {
    const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Handle "Hover to Expand" during drag
    const handleDragOver = () => {
        if (isCollapsed && !hoverTimerRef.current) {
            hoverTimerRef.current = setTimeout(() => {
                onToggle()
                hoverTimerRef.current = null
            }, 600) // 600ms delay before auto-expanding
        }
    }

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
        }
    }, [])

    return (
        <div className={cn(
            "relative flex h-full shrink-0 flex-col rounded-2xl transition-all duration-300",
            isCollapsed ? "w-48 bg-transparent py-2" : "bg-gray-100 p-2" // Increased width to w-48
        )}>
            {/* Header - Always Visible */}
            <div className={cn(
                "mb-3 flex items-center justify-between px-2",
                isCollapsed && "mb-4" // Removed flex-col gap-2
            )}>
                <div className={cn(
                    "flex items-center gap-2",
                    // Removed isCollapsed && "flex-col" to keep horizontal layout
                )}>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 text-center">
                        {phaseName}
                    </h3>
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {totalCount}
                    </span>
                </div>

                <button
                    onClick={onToggle}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                    title={isCollapsed ? "Expandir fase" : "Recolher fase"}
                >
                    <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", isCollapsed && "rotate-180")} />
                </button>
            </div>

            {/* Content Container */}
            <div className={cn(
                "flex h-full flex-1 min-h-0",
                isCollapsed ? "justify-center" : "gap-4"
            )}>
                {isCollapsed ? (
                    <KanbanCollapsedPhase
                        phaseName={phaseName}
                        totalCount={totalCount}
                        totalValue={totalValue}
                        onClick={onToggle}
                        onDragOver={handleDragOver}
                    />
                ) : (
                    children
                )}
            </div>
        </div>
    )
}
