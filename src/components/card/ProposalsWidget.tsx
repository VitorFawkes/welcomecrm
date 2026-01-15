import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProposalsByCard, useCreateProposal, useDeleteProposal } from '@/hooks/useProposal'
import { PROPOSAL_STATUS_CONFIG } from '@/types/proposals'
import { Button } from '@/components/ui/Button'
import {
    FileText,
    Plus,
    ExternalLink,
    MoreVertical,
    Trash2,
    Eye,
    Clock,
    Loader2,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface ProposalsWidgetProps {
    cardId: string
}

export function ProposalsWidget({ cardId }: ProposalsWidgetProps) {
    const navigate = useNavigate()
    const [isCreating, setIsCreating] = useState(false)

    const { data: proposals = [], isLoading } = useProposalsByCard(cardId)
    const createProposal = useCreateProposal()
    const deleteProposal = useDeleteProposal()

    const handleCreateProposal = async () => {
        setIsCreating(true)
        try {
            const { proposal } = await createProposal.mutateAsync({
                cardId,
                title: 'Nova Proposta',
            })
            toast.success('Proposta criada!', {
                description: 'Redirecionando para o editor...',
            })
            navigate(`/proposals/${proposal.id}/edit`)
        } catch (error) {
            console.error('Error creating proposal:', error)
            toast.error('Erro ao criar proposta', {
                description: 'Tente novamente ou contate o suporte.',
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleDeleteProposal = async (proposalId: string) => {
        if (!confirm('Tem certeza que deseja excluir esta proposta?')) return
        try {
            await deleteProposal.mutateAsync(proposalId)
        } catch (error) {
            console.error('Error deleting proposal:', error)
        }
    }

    const handleCopyLink = (token: string) => {
        const url = `${window.location.origin}/p/${token}`
        navigator.clipboard.writeText(url)
        // Could add toast notification here
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <h3 className="font-medium text-slate-900">Propostas</h3>
                    {proposals.length > 0 && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
                            {proposals.length}
                        </span>
                    )}
                </div>
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCreateProposal}
                    disabled={isCreating}
                    className="h-7 px-2 text-xs"
                >
                    {isCreating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <>
                            <Plus className="h-3 w-3 mr-1" />
                            Nova
                        </>
                    )}
                </Button>
            </div>

            {/* Content */}
            <div className="divide-y divide-slate-100">
                {isLoading ? (
                    <div className="p-4 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                ) : proposals.length === 0 ? (
                    <div className="p-6 text-center">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                            <FileText className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 mb-3">
                            Nenhuma proposta criada
                        </p>
                        <Button
                            size="sm"
                            onClick={handleCreateProposal}
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Plus className="h-4 w-4 mr-2" />
                            )}
                            Criar Proposta
                        </Button>
                    </div>
                ) : (
                    proposals.map((proposal) => {
                        const statusConfig = PROPOSAL_STATUS_CONFIG[proposal.status as keyof typeof PROPOSAL_STATUS_CONFIG]
                        const timeAgo = formatDistanceToNow(new Date(proposal.created_at!), {
                            addSuffix: true,
                            locale: ptBR,
                        })

                        return (
                            <div
                                key={proposal.id}
                                className="px-4 py-3 hover:bg-slate-50 transition-colors group"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        {/* Title */}
                                        <button
                                            onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                                            className="font-medium text-slate-900 text-sm hover:text-blue-600 transition-colors text-left truncate block w-full"
                                        >
                                            {proposal.active_version?.title || 'Sem título'}
                                        </button>

                                        {/* Meta */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className={`text-xs px-1.5 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}
                                            >
                                                {statusConfig.label}
                                            </span>
                                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                {timeAgo}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="p-1 rounded hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreVertical className="h-4 w-4 text-slate-400" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() => navigate(`/proposals/${proposal.id}/edit`)}
                                            >
                                                <Eye className="h-4 w-4 mr-2" />
                                                Editar
                                            </DropdownMenuItem>

                                            {proposal.public_token && (
                                                <DropdownMenuItem
                                                    onClick={() => handleCopyLink(proposal.public_token!)}
                                                >
                                                    <ExternalLink className="h-4 w-4 mr-2" />
                                                    Copiar Link
                                                </DropdownMenuItem>
                                            )}

                                            {proposal.status === 'draft' && (
                                                <DropdownMenuItem
                                                    onClick={() => handleDeleteProposal(proposal.id)}
                                                    className="text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Excluir
                                                </DropdownMenuItem>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    )
}
