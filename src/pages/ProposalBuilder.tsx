import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProposal } from '@/hooks/useProposal'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { useAutoSave } from '@/hooks/useAutoSave'
import { ProposalBuilderHeader } from '@/components/proposals/ProposalBuilderHeader'
import { ProposalBuilderSidebar } from '@/components/proposals/ProposalBuilderSidebar'
import { SectionList } from '@/components/proposals/SectionList'
import { ProposalPreview } from '@/components/proposals/ProposalPreview'
import { Loader2, Eye, EyeOff, PanelRightClose, PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function ProposalBuilder() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: proposal, isLoading, error } = useProposal(id!)
    const { initialize, reset } = useProposalBuilder()
    const [showPreview, setShowPreview] = useState(true)
    const [showSidebar, setShowSidebar] = useState(true)

    // Auto-save hook
    useAutoSave()

    // Initialize builder with proposal data
    useEffect(() => {
        if (proposal?.active_version) {
            initialize(
                proposal,
                proposal.active_version,
                proposal.active_version.sections || []
            )
        }
        return () => {
            reset()
        }
    }, [proposal, initialize, reset])

    if (isLoading) {
        return (
            <div className="h-dvh flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                    <p className="text-sm text-slate-500">Carregando proposta...</p>
                </div>
            </div>
        )
    }

    if (error || !proposal) {
        return (
            <div className="h-dvh flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <p className="text-red-600 mb-4">Erro ao carregar proposta</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="text-blue-600 hover:underline"
                    >
                        Voltar
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-dvh flex flex-col bg-gray-50 overflow-hidden">
            {/* Header */}
            <ProposalBuilderHeader proposal={proposal} />

            {/* Toolbar */}
            <div className="flex-none h-10 px-4 flex items-center justify-between bg-white border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Layout:</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                            showPreview
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                    >
                        {showPreview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                        Prévia
                    </button>
                    <button
                        onClick={() => setShowSidebar(!showSidebar)}
                        className={cn(
                            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                            showSidebar
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        )}
                    >
                        {showSidebar ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRight className="h-3.5 w-3.5" />}
                        Painel
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex">
                {/* Editor Area */}
                <div className={cn(
                    'overflow-y-auto p-6 transition-all duration-300',
                    showPreview && showSidebar ? 'w-1/3' : showPreview || showSidebar ? 'w-1/2' : 'flex-1'
                )}>
                    <div className="max-w-2xl mx-auto">
                        <SectionList />
                    </div>
                </div>

                {/* Preview Panel */}
                {showPreview && (
                    <div className={cn(
                        'border-l border-slate-200 transition-all duration-300',
                        showSidebar ? 'w-1/3' : 'w-1/2'
                    )}>
                        <ProposalPreview />
                    </div>
                )}

                {/* Sidebar */}
                {showSidebar && (
                    <div className={cn(
                        'border-l border-slate-200 bg-white overflow-y-auto transition-all duration-300',
                        showPreview ? 'w-1/3' : 'w-1/2',
                        'max-w-[400px]'
                    )}>
                        <ProposalBuilderSidebar proposal={proposal} />
                    </div>
                )}
            </div>
        </div>
    )
}
