import { CheckCircle2, Circle, AlertCircle, FileText, Phone, Users, Mail, MessageSquare } from 'lucide-react'
import type { Database } from '../../database.types'
import { cn } from '../../lib/utils'
import { useStageRequirements, type Requirement } from '../../hooks/useStageRequirements'

type Card = Database['public']['Tables']['cards']['Row']

interface StageRequirementsProps {
    card: Card
}

// Icon mapping for different task types
const TASK_TYPE_ICONS: Record<string, React.ElementType> = {
    ligacao: Phone,
    reuniao: Users,
    email: Mail,
    whatsapp: MessageSquare,
    enviar_proposta: FileText,
    tarefa: CheckCircle2,
    solicitacao_mudanca: AlertCircle
}

// Labels for proposal statuses
const PROPOSAL_STATUS_LABELS: Record<string, string> = {
    draft: 'Criada (Rascunho)',
    sent: 'Enviada',
    viewed: 'Visualizada',
    in_progress: 'Em Andamento',
    accepted: 'Aceita'
}

// Labels for task types
const TASK_TYPE_LABELS: Record<string, string> = {
    ligacao: 'Ligação',
    reuniao: 'Reunião',
    email: 'E-mail',
    whatsapp: 'WhatsApp',
    enviar_proposta: 'Enviar Proposta',
    tarefa: 'Tarefa',
    solicitacao_mudanca: 'Mudança'
}

export default function StageRequirements({ card }: StageRequirementsProps) {
    const {
        isLoading,
        blockingRequirements,
        checkRequirement
    } = useStageRequirements(card)

    if (isLoading) return <div className="animate-pulse h-20 bg-gray-100 rounded-lg"></div>
    if (blockingRequirements.length === 0) return null

    const completedBlocking = blockingRequirements.filter(req => checkRequirement(req)).length
    const totalBlocking = blockingRequirements.length
    const isAllBlockingCompleted = completedBlocking === totalBlocking

    // Get icon for requirement
    const getRequirementIcon = (req: Requirement) => {
        if (req.requirement_type === 'field') {
            return CheckCircle2
        }
        if (req.requirement_type === 'proposal') {
            return FileText
        }
        if (req.requirement_type === 'task') {
            return TASK_TYPE_ICONS[req.task_tipo] || CheckCircle2
        }
        return CheckCircle2
    }

    // Get label for requirement
    const getRequirementLabel = (req: Requirement): string => {
        switch (req.requirement_type) {
            case 'field':
                return req.label
            case 'proposal': {
                const statusLabel = PROPOSAL_STATUS_LABELS[req.proposal_min_status] || req.proposal_min_status
                return `Proposta ${statusLabel}`
            }
            case 'task': {
                const typeLabel = TASK_TYPE_LABELS[req.task_tipo] || req.task_tipo
                return `${typeLabel} ${req.task_require_completed ? 'Concluída' : 'Criada'}`
            }
            default:
                // Exhaustive check - should never reach here
                return (req as { label?: string }).label || 'Requisito'
        }
    }

    // Get badge color for requirement type
    const getTypeBadge = (req: Requirement) => {
        if (req.requirement_type === 'proposal') {
            return <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Proposta</span>
        }
        if (req.requirement_type === 'task') {
            return <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Tarefa</span>
        }
        return null
    }

    return (
        <div className="space-y-4 mb-6">
            {/* Blocking Requirements (Current Stage) */}
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
                    {blockingRequirements.map((req: Requirement) => {
                        const isCompleted = checkRequirement(req)
                        const Icon = getRequirementIcon(req)

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
                                    <div className="flex items-center gap-2">
                                        <Icon className={cn(
                                            "w-4 h-4",
                                            isCompleted ? "text-gray-400" : "text-gray-600"
                                        )} />
                                        <p className={`text-sm font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
                                            {getRequirementLabel(req)}
                                        </p>
                                        {getTypeBadge(req)}
                                    </div>
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
        </div>
    )
}
