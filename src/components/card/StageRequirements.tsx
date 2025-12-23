import { CheckCircle2, Circle, AlertCircle } from 'lucide-react'
import type { Database } from '../../database.types'
import { cn } from '../../lib/utils'
import { useStageRequirements } from '../../hooks/useStageRequirements'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface StageRequirementsProps {
    card: Card
}

export default function StageRequirements({ card }: StageRequirementsProps) {
    const {
        isLoading,
        blockingRequirements,
        futureRequirements,
        checkRequirement
    } = useStageRequirements(card)

    if (isLoading) return <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>
    if (blockingRequirements.length === 0 && futureRequirements.length === 0) return null

    const completedBlocking = blockingRequirements.filter(req => checkRequirement(req.field_key)).length
    const totalBlocking = blockingRequirements.length

    const isAllBlockingCompleted = completedBlocking === totalBlocking

    return (
        <div className="space-y-4 mb-6">
            {/* Blocking Requirements (Current Stage) */}
            {blockingRequirements.length > 0 && (
                <div className={cn(
                    "bg-white rounded-xl shadow-sm border overflow-hidden",
                    isAllBlockingCompleted ? "border-green-100" : "border-red-100"
                )}>
                    <div className={cn(
                        "px-4 py-3 border-b flex justify-between items-center",
                        isAllBlockingCompleted ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
                    )}>
                        <h3 className={cn(
                            "font-semibold flex items-center gap-2",
                            isAllBlockingCompleted ? "text-green-900" : "text-red-900"
                        )}>
                            {isAllBlockingCompleted ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                            Obrigações da Etapa Atual
                        </h3>
                        <span className={cn(
                            "text-xs font-medium px-2 py-1 rounded-full",
                            isAllBlockingCompleted ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        )}>
                            {completedBlocking}/{totalBlocking}
                        </span>
                    </div>

                    <div className="divide-y divide-gray-50">
                        {blockingRequirements.map((req: any) => {
                            const isCompleted = checkRequirement(req.field_key)
                            return (
                                <div key={req.id} className={`p-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${isCompleted ? 'opacity-75' : ''}`}>
                                    <div className={`mt-0.5 flex-shrink-0`}>
                                        {isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <Circle className="w-5 h-5 text-red-300" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                            {req.label}
                                        </p>
                                        {!isCompleted && (
                                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" />
                                                Bloqueia avanço de etapa
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

        </div>
    )
}
