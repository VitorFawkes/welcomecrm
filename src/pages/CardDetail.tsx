import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import CardHeader from '../components/card/CardHeader'
import StageRequirements from '../components/card/StageRequirements'
import CardTasks from '../components/card/CardTasks'
import TripInformation from '../components/card/TripInformation'
import ObservacoesEstruturadas from '../components/card/ObservacoesEstruturadas'
import { DynamicSectionsList } from '../components/card/DynamicSectionWidget'

import ConversationHistory from '../components/card/ConversationHistory'
import PessoasWidget from '../components/card/PessoasWidget'

import ActivityFeed from '../components/card/ActivityFeed'
import { ParentLinkBanner } from '../components/cards/group/ParentLinkBanner'
import GroupDetailLayout from '../components/cards/group/GroupDetailLayout'
import SubCardsList from '../components/card/SubCardsList'
import MondeWidget from '../components/card/MondeWidget'
import { SubCardParentBanner } from '../components/pipeline/SubCardBadge'
import { useSubCards, useSubCardParent } from '../hooks/useSubCards'
import { useReceitaPermission } from '../hooks/useReceitaPermission'
import CostEditorModal from '../components/card/CostEditorModal'
import FinancialItemsModal from '../components/card/FinancialItemsModal'
import { ArrowLeft, DollarSign, TrendingUp } from 'lucide-react'

import type { Database } from '../database.types'

type Card = Database['public']['Tables']['cards']['Row']

export default function CardDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const receitaPerm = useReceitaPermission()
    const [showCostEditor, setShowCostEditor] = useState(false)
    const [showFinancialItems, setShowFinancialItems] = useState(false)

    // Check if card is a sub-card and get parent info
    const { isSubCard, subCardMode, parentCard } = useSubCardParent(id)

    // Get sub-cards if this is a parent
    const { canCreateSubCard } = useSubCards(id)

    const { data: card, isLoading } = useQuery({
        queryKey: ['card-detail', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('id', id!)
                .single()
            if (error) throw error
            return data as Card
        },
        enabled: !!id,
        staleTime: 1000 * 30, // 30 seconds to avoid immediate refetch flickers
    })

    // Get the card's current phase
    const { data: stageInfo } = useQuery({
        queryKey: ['card-stage-info', card?.pipeline_stage_id],
        queryFn: async () => {
            if (!card?.pipeline_stage_id) return null
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('fase, phase_id')
                .eq('id', card.pipeline_stage_id)
                .single()
            if (error) return null
            return data
        },
        enabled: !!card?.pipeline_stage_id,
    })

    // Determine if we can show sub-cards functionality
    const showSubCards = stageInfo?.fase === 'Pós-venda' &&
        (card as any)?.card_type !== 'sub_card' &&
        !card?.is_group_parent

    // Get accepted proposal for Monde widget
    const { data: acceptedProposal } = useQuery({
        queryKey: ['card-accepted-proposal', id],
        queryFn: async () => {
            if (!id) return null
            const { data, error } = await supabase
                .from('proposals')
                .select('id, status')
                .eq('card_id', id)
                .eq('status', 'accepted')
                .limit(1)
                .maybeSingle()
            if (error) return null
            return data
        },
        enabled: !!id,
    })

    if (isLoading) return <div className="p-8 text-center">Carregando...</div>
    if (!card) return <div className="p-8 text-center">Viagem não encontrada</div>

    // If it is a Group Parent (Mother Trip), render the specialized layout
    if (card.is_group_parent) {
        return (
            <div className="h-dvh flex flex-col bg-gray-50 relative overflow-hidden">
                <div className="flex-none border-b border-gray-200 bg-white z-10 relative">
                    <div className="flex items-center h-14 px-4 gap-4">
                        <button
                            onClick={() => navigate('/pipeline')}
                            className="p-2 hover:bg-gray-100 rounded-full text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div className="h-6 w-px bg-gray-200" />
                        <span className="font-medium text-gray-900">Detalhes do Grupo</span>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden relative z-0">
                    <GroupDetailLayout card={card} onUpdate={() => { }} />
                </div>
            </div>
        )
    }

    return (
        <div className="h-full bg-gray-50 flex flex-col overflow-hidden">
            {/* Breadcrumb */}
            <div className="flex-none bg-white border-b border-slate-200 px-6 py-2">
                <nav className="flex items-center gap-2 text-sm">
                    <button
                        onClick={() => navigate('/pipeline')}
                        className="text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Pipeline
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="text-slate-900 font-medium truncate max-w-[200px]">
                        {card.titulo || 'Viagem'}
                    </span>
                </nav>
            </div>



            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white shadow-md">
                <CardHeader card={card} />
            </div>

            {/* 2-Column Layout: Work Area + Context/Accountability */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 p-6">
                {/* CENTER COLUMN - Work Area (What to do) */}
                <div className="min-h-0 overflow-y-auto space-y-4 pr-2 scroll-smooth" style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}>
                    {/* Sub-Card Parent Banner (if this is a sub-card) */}
                    {isSubCard && parentCard && subCardMode && (
                        <SubCardParentBanner
                            parentId={parentCard.id}
                            parentTitle={parentCard.titulo}
                            mode={subCardMode}
                            onNavigate={() => navigate(`/cards/${parentCard.id}`)}
                        />
                    )}

                    {/* Group Child Banner (if this is a group child) */}
                    {card.parent_card_id && !isSubCard && (
                        <ParentLinkBanner parentId={card.parent_card_id} />
                    )}

                    {/* Stage Requirements (Checklist) */}
                    <StageRequirements card={card} />

                    {/* Tasks & Meetings (Unified) */}
                    <CardTasks cardId={card.id!} />

                    {/* Notes & Observations (Informações Importantes) */}
                    <ObservacoesEstruturadas card={card} />

                    {/* Dynamic Custom Sections (left_column) - Always above ConversationHistory */}
                    <DynamicSectionsList
                        card={card}
                        position="left_column"
                        excludeKeys={['observacoes_criticas', 'trip_info', 'people', 'payment', 'system']}
                    />

                    {/* Conversation History - Always Last */}
                    <ConversationHistory cardId={card.id!} contactId={card.pessoa_principal_id} />
                </div>

                {/* SIDEBAR - Context & Accountability */}
                <div className="min-h-0 overflow-y-auto space-y-4 scroll-smooth" style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}>
                    {/* Sub-Cards List (for cards in Pós-venda) */}
                    {showSubCards && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <SubCardsList
                                parentCardId={card.id!}
                                parentTitle={card.titulo || 'Card'}
                                parentValor={card.valor_final || card.valor_estimado}
                                canCreate={canCreateSubCard({
                                    card_type: (card as any).card_type,
                                    fase: stageInfo?.fase,
                                    is_group_parent: card.is_group_parent
                                })}
                            />
                        </div>
                    )}

                    {/* Monde Sales Widget */}
                    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                        <MondeWidget
                            cardId={card.id!}
                            proposalId={acceptedProposal?.id}
                            hasAcceptedProposal={!!acceptedProposal}
                        />
                    </div>

                    {/* Financeiro Widget (Valor de Venda + Receita) */}
                    {receitaPerm.canView && (
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4 text-amber-600" />
                                    Financeiro
                                </h3>
                                <div className="flex items-center gap-2">
                                    {acceptedProposal ? (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                            Proposta
                                        </span>
                                    ) : (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
                                            Manual
                                        </span>
                                    )}
                                    {receitaPerm.canEdit && (
                                        <button
                                            onClick={() => acceptedProposal ? setShowCostEditor(true) : setShowFinancialItems(true)}
                                            className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                                        >
                                            {acceptedProposal ? 'Editar custos' : 'Editar produtos'}
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Valor de Venda */}
                            {card.valor_final != null && (
                                <div className="flex items-baseline justify-between mb-2">
                                    <span className="text-xs text-gray-500">Valor de Venda</span>
                                    <span className="text-lg font-bold text-gray-900">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(card.valor_final))}
                                    </span>
                                </div>
                            )}

                            {/* Receita */}
                            <div className="flex items-baseline justify-between mb-2">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                    <TrendingUp className="h-3 w-3" />
                                    Receita
                                </span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-bold text-amber-700">
                                        {card.receita != null
                                            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(card.receita))
                                            : '—'}
                                    </span>
                                    {card.valor_final != null && card.receita != null && Number(card.valor_final) > 0 && (
                                        <span className="text-xs text-gray-400">
                                            {((Number(card.receita) / Number(card.valor_final)) * 100).toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Investimento (referencia) */}
                            {card.valor_estimado != null && (
                                <div className="flex items-baseline justify-between pt-2 border-t border-gray-100">
                                    <span className="text-xs text-gray-400">Investimento</span>
                                    <span className="text-sm text-gray-400">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_estimado)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Financial Modals */}
                    <CostEditorModal
                        isOpen={showCostEditor}
                        onClose={() => setShowCostEditor(false)}
                        cardId={card.id!}
                    />
                    <FinancialItemsModal
                        isOpen={showFinancialItems}
                        onClose={() => setShowFinancialItems(false)}
                        cardId={card.id!}
                    />

                    {/* 1. Pessoas (Contact + Travelers) */}
                    <PessoasWidget card={card} />

                    {/* 3. Trip Details */}
                    <TripInformation card={card} />

                    {/* Dynamic Custom Sections (right_column) - includes Proposals widget */}
                    <DynamicSectionsList
                        card={card}
                        position="right_column"
                        excludeKeys={['observacoes_criticas', 'trip_info', 'people', 'payment', 'system']}
                    />

                    {/* Activity Feed (History) */}
                    <ActivityFeed cardId={card.id!} />
                </div>
            </div>
        </div >
    )
}
