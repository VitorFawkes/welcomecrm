import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useProposal } from '@/hooks/useProposal'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { ProposalBuilderHeader } from '@/components/proposals/ProposalBuilderHeader'
import { ProposalBuilderSidebar } from '@/components/proposals/ProposalBuilderSidebar'
import { SectionList } from '@/components/proposals/SectionList'
import { Loader2 } from 'lucide-react'

export default function ProposalBuilder() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { data: proposal, isLoading, error } = useProposal(id!)
    const { initialize, reset } = useProposalBuilder()

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

            {/* Main Content */}
            <div className="flex-1 min-h-0 flex">
                {/* Editor Area - 65% */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto">
                        <SectionList />
                    </div>
                </div>

                {/* Sidebar - 35% */}
                <div className="w-[400px] border-l border-slate-200 bg-white overflow-y-auto">
                    <ProposalBuilderSidebar proposal={proposal} />
                </div>
            </div>
        </div>
    )
}
