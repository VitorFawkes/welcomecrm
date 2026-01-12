import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { Button } from '@/components/ui/Button'
import {
    ArrowLeft,
    Save,
    Send,
    Eye,
    MoreVertical,
    Loader2,
    Clock,
    Copy,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PROPOSAL_STATUS_CONFIG } from '@/types/proposals'
import type { Proposal, ProposalStatus } from '@/types/proposals'

interface ProposalBuilderHeaderProps {
    proposal: Proposal
}

export function ProposalBuilderHeader({ proposal }: ProposalBuilderHeaderProps) {
    const navigate = useNavigate()
    const { version, isDirty, isSaving, lastSavedAt, save, publish } = useProposalBuilder()
    const [isPublishing, setIsPublishing] = useState(false)

    const statusConfig = PROPOSAL_STATUS_CONFIG[proposal.status as ProposalStatus]

    const handleSave = async () => {
        try {
            await save()
        } catch (error) {
            console.error('Error saving:', error)
        }
    }

    const handlePublish = async () => {
        setIsPublishing(true)
        try {
            const token = await publish()
            const url = `${window.location.origin}/p/${token}`
            await navigator.clipboard.writeText(url)
            alert('Link copiado para a área de transferência!')
        } catch (error) {
            console.error('Error publishing:', error)
        } finally {
            setIsPublishing(false)
        }
    }

    const handleCopyLink = () => {
        if (proposal.public_token) {
            const url = `${window.location.origin}/p/${proposal.public_token}`
            navigator.clipboard.writeText(url)
        }
    }

    const handlePreview = () => {
        if (proposal.public_token) {
            window.open(`/p/${proposal.public_token}`, '_blank')
        }
    }

    return (
        <header className="flex-none h-14 border-b border-slate-200 bg-white px-4 flex items-center justify-between">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate(`/cards/${proposal.card_id}`)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>

                <div className="h-6 w-px bg-slate-200" />

                <div>
                    <h1 className="font-semibold text-slate-900 text-sm">
                        {version?.title || 'Nova Proposta'}
                    </h1>
                    <div className="flex items-center gap-2 text-xs">
                        <span className={`px-1.5 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                        {lastSavedAt && (
                            <span className="text-slate-400 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Salvo às {lastSavedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                        {isDirty && (
                            <span className="text-amber-600 flex items-center gap-1">
                                • Alterações não salvas
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
                {/* Save Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className="h-8"
                >
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                        <Save className="h-4 w-4 mr-1" />
                    )}
                    Salvar
                </Button>

                {/* Preview Button */}
                {proposal.public_token && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handlePreview}
                        className="h-8"
                    >
                        <Eye className="h-4 w-4 mr-1" />
                        Prévia
                    </Button>
                )}

                {/* Send/Publish Button */}
                {proposal.status === 'draft' ? (
                    <Button
                        size="sm"
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="h-8"
                    >
                        {isPublishing ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                            <Send className="h-4 w-4 mr-1" />
                        )}
                        Enviar
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="h-8"
                    >
                        <Copy className="h-4 w-4 mr-1" />
                        Copiar Link
                    </Button>
                )}

                {/* More Options */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <MoreVertical className="h-4 w-4 text-slate-500" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handlePreview} disabled={!proposal.public_token}>
                            <Eye className="h-4 w-4 mr-2" />
                            Visualizar Proposta
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleCopyLink} disabled={!proposal.public_token}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Link Público
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                            <Clock className="h-4 w-4 mr-2" />
                            Ver Histórico de Versões
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
