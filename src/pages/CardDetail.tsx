import { useParams } from 'react-router-dom'
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
import MetricsWidget from '../components/card/MetricsWidget'
import TaxaPlanejamentoCard from '../components/card/TaxaPlanejamentoCard'
import ActivityFeed from '../components/card/ActivityFeed'

import type { Database } from '../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

export default function CardDetail() {
    const { id } = useParams<{ id: string }>()

    const { data: card, isLoading } = useQuery({
        queryKey: ['card', id],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('view_cards_acoes')
                .select('*')
                .eq('id', id!)
                .single()
            if (error) throw error
            return data as Card
        },
        enabled: !!id
    })

    if (isLoading) return <div className="p-8 text-center">Carregando...</div>
    if (!card) return <div className="p-8 text-center">Card não encontrado</div>

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
                    <StageRequirements card={card} />

                    {/* Tasks & Meetings (Unified) */}
                    <CardTasks cardId={card.id!} />

                    {/* Notes & Observations */}
                    <ObservacoesEstruturadas card={card} />

                    {/* General Free-form Observations */}
                    <ObservacoesLivres card={card} />

                    {/* Conversation History */}
                    <ConversationHistory cardId={card.id!} />
                </div>

                {/* SIDEBAR - Context & Accountability */}
                <div className="min-h-0 overflow-y-auto space-y-4 scroll-smooth" style={{ scrollbarGutter: 'stable', overscrollBehaviorY: 'contain' }}>
                    {/* 1. Metrics + Owner (Accountability First) */}
                    <MetricsWidget card={card} />

                    {/* 2. Pessoas (Contact + Travelers) */}
                    <PessoasWidget card={card} />

                    {/* 3. Trip Details */}
                    <TripInformation card={card} />

                    {/* Planning Fee */}
                    {card.produto === 'TRIPS' && <TaxaPlanejamentoCard card={card} />}

                    {/* Activity Feed (History) */}
                    <ActivityFeed cardId={card.id!} />
                </div>
            </div>
        </div>
    )
}
