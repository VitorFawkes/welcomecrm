import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import CardHeader from '../components/card/CardHeader'
import StageRequirements from '../components/card/StageRequirements'
import CardTasks from '../components/card/CardTasks'
import TripInformation from '../components/card/TripInformation'
import ObservacoesEstruturadas from '../components/card/ObservacoesEstruturadas'
import ObservacoesLivres from '../components/card/ObservacoesLivres'
import ConversationHistory from '../components/card/ConversationHistory'
import PessoasWidget from '../components/card/PessoasWidget'

import ActivityFeed from '../components/card/ActivityFeed'
import { ParentLinkBanner } from '../components/cards/group/ParentLinkBanner'
import GroupDetailLayout from '../components/cards/group/GroupDetailLayout'
import { ArrowLeft } from 'lucide-react'

import type { Database } from '../database.types'

type Card = Database['public']['Tables']['cards']['Row']

export default function CardDetail() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()



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
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-white shadow-md">
                <CardHeader card={card} />
            </div>

            {/* 2-Column Layout: Work Area + Context/Accountability */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-6 p-6">
                {/* CENTER COLUMN - Work Area (What to do) */}
                <div className="min-h-0 overflow-y-auto space-y-4 pr-2 scroll-smooth" style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}>
                    {/* Stage Requirements (Checklist) */}
                    {card.parent_card_id && (
                        <ParentLinkBanner parentId={card.parent_card_id} />
                    )}
                    <StageRequirements card={card} />

                    {/* Tasks & Meetings (Unified) */}
                    <CardTasks cardId={card.id!} />

                    {/* Notes & Observations */}
                    <ObservacoesEstruturadas card={card} />

                    {/* General Free-form Observations */}
                    <ObservacoesLivres card={card} />

                    {/* Conversation History */}
                    <ConversationHistory cardId={card.id!} contactId={card.pessoa_principal_id} />
                </div>

                {/* SIDEBAR - Context & Accountability */}
                <div className="min-h-0 overflow-y-auto space-y-4 scroll-smooth" style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}>
                    {/* 1. Pessoas (Contact + Travelers) */}
                    <PessoasWidget card={card} />

                    {/* 3. Trip Details */}
                    <TripInformation card={card} />



                    {/* Activity Feed (History) */}
                    <ActivityFeed cardId={card.id!} />
                </div>
            </div>
        </div>
    )
}
