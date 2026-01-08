import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { AlertTriangle, Clock, CalendarX, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

export default function CRMHealth() {
    const { data: cards, isLoading } = useQuery({
        queryKey: ['crm-health-cards'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('view_cards_acoes')
                .select('*')
                .eq('produto', 'TRIPS') // Focus on TRIPS for now
                .neq('fase', 'Pós-venda') // Ignore completed/won deals usually? Or maybe keep them. Let's keep all active.
                .neq('status_comercial', 'lost')
                .neq('status_comercial', 'won') // Only active cards

            if (error) throw error
            return data as Card[]
        }
    })

    if (isLoading) return <div className="p-8">Carregando diagnóstico...</div>

    const overdueCards = cards?.filter(c => c.urgencia_tempo_etapa === 1) || []
    const stagnantCards = cards?.filter(c => (c.tempo_sem_contato || 0) > 7) || [] // > 7 days without contact
    const noTaskCards = cards?.filter(c => !c.proxima_tarefa) || []

    const healthScore = cards?.length ? Math.round(100 - (((overdueCards.length + noTaskCards.length) / (cards.length * 2)) * 100)) : 100

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Saúde do CRM</h1>
                    <p className="text-gray-500">Diagnóstico operacional e gargalos</p>
                </div>
                <div className={`px-4 py-2 rounded-lg font-bold text-xl ${healthScore > 80 ? 'bg-green-100 text-green-700' :
                    healthScore > 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                    Score: {healthScore}/100
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <HealthCard
                    title="Atrasados (SLA)"
                    count={overdueCards.length}
                    icon={Clock}
                    color="red"
                    description="Cards que estouraram o tempo limite da etapa."
                />
                <HealthCard
                    title="Sem Tarefa Futura"
                    count={noTaskCards.length}
                    icon={CalendarX}
                    color="orange"
                    description="Cards sem próximo passo definido."
                />
                <HealthCard
                    title="Estagnados (>7 dias)"
                    count={stagnantCards.length}
                    icon={AlertTriangle}
                    color="yellow"
                    description="Sem atualização ou contato há mais de uma semana."
                />
            </div>

            {/* Detailed Lists */}
            <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-900">Atenção Necessária</h2>

                {overdueCards.length > 0 && (
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 bg-red-50 border-b border-red-100 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-red-600" />
                            <h3 className="font-medium text-red-900">SLA Estourado ({overdueCards.length})</h3>
                        </div>
                        <div className="divide-y">
                            {overdueCards.slice(0, 5).map(card => (
                                <CardRow key={card.id} card={card} reason="Tempo na etapa excedido" />
                            ))}
                            {overdueCards.length > 5 && (
                                <div className="p-3 text-center text-sm text-gray-500">
                                    + {overdueCards.length - 5} outros cards
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {noTaskCards.length > 0 && (
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                        <div className="p-4 bg-orange-50 border-b border-orange-100 flex items-center gap-2">
                            <CalendarX className="w-5 h-5 text-orange-600" />
                            <h3 className="font-medium text-orange-900">Sem Próxima Tarefa ({noTaskCards.length})</h3>
                        </div>
                        <div className="divide-y">
                            {noTaskCards.slice(0, 5).map(card => (
                                <CardRow key={card.id} card={card} reason="Nenhuma tarefa agendada" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

interface HealthCardProps {
    title: string
    count: number
    icon: React.ElementType
    color: string
    description: string
}

function HealthCard({ title, count, icon: Icon, color, description }: HealthCardProps) {
    const colors = {
        red: 'bg-red-50 text-red-700 border-red-100',
        orange: 'bg-orange-50 text-orange-700 border-orange-100',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-100',
        green: 'bg-green-50 text-green-700 border-green-100',
    }

    return (
        <div className={`p-6 rounded-xl border ${colors[color as keyof typeof colors]}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-medium opacity-90">{title}</p>
                    <h3 className="text-3xl font-bold mt-2">{count}</h3>
                </div>
                <Icon className="w-8 h-8 opacity-50" />
            </div>
            <p className="text-sm mt-4 opacity-75">{description}</p>
        </div>
    )
}

function CardRow({ card, reason }: { card: Card, reason: string }) {
    return (
        <div className="p-4 flex items-center justify-between hover:bg-gray-50 group">
            <div>
                <Link to={`/app/cards/${card.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {card.titulo}
                </Link>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <span>{card.etapa_nome}</span>
                    <span>•</span>
                    <span>{card.dono_atual_nome}</span>
                </div>
            </div>
            <div className="text-right">
                <span className="text-sm font-medium text-red-600">{reason}</span>
                <Link
                    to={`/app/cards/${card.id}`}
                    className="flex items-center gap-1 text-xs text-blue-600 mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end"
                >
                    Ver Card <ArrowRight className="w-3 h-3" />
                </Link>
            </div>
        </div>
    )
}
