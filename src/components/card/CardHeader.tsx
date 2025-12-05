import { useState } from 'react'
import { ArrowLeft, Calendar, DollarSign, User, TrendingUp, History } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'
import OwnerHistoryModal from './OwnerHistoryModal'
import ActionButtons from './ActionButtons'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface CardHeaderProps {
    card: Card
}

export default function CardHeader({ card }: CardHeaderProps) {
    const navigate = useNavigate()
    const [showOwnerHistory, setShowOwnerHistory] = useState(false)

    const phaseColors = {
        'SDR': 'bg-blue-600 text-white',
        'Planner': 'bg-purple-600 text-white',
        'Pós-venda': 'bg-green-600 text-white',
        'Outro': 'bg-gray-600 text-white'
    }

    const statusColors = {
        'aberto': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'ganho': 'bg-green-100 text-green-800 border-green-200',
        'perdido': 'bg-red-100 text-red-800 border-red-200',
        'pausado': 'bg-gray-100 text-gray-800 border-gray-200'
    }

    return (
        <>
            <div className="flex flex-col gap-4 bg-white border-b border-gray-200 shadow-sm px-6 py-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <button onClick={() => navigate(-1)} className="hover:text-gray-900 flex items-center gap-1">
                        <ArrowLeft className="h-4 w-4" /> Voltar
                    </button>
                    <span>/</span>
                    <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-xs">
                        {card.produto}
                    </span>
                </div>

                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h1 className="text-2xl font-bold text-gray-900 truncate max-w-full" title={card.titulo || ''}>{card.titulo}</h1>
                            <div className="flex gap-2 shrink-0">
                                <span className={cn(
                                    "px-3 py-1 rounded-full font-semibold text-sm whitespace-nowrap",
                                    phaseColors[card.fase as keyof typeof phaseColors] || phaseColors['Outro']
                                )}>
                                    {card.fase}
                                </span>
                                <span className={cn(
                                    "px-3 py-1 rounded-md border text-xs font-medium whitespace-nowrap",
                                    statusColors[card.status_comercial as keyof typeof statusColors] || statusColors['aberto']
                                )}>
                                    {card.status_comercial?.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5 shrink-0">
                                <User className="h-4 w-4" />
                                <span className="truncate max-w-[150px]">{card.dono_atual_nome || 'Sem dono'}</span>
                                <button
                                    onClick={() => setShowOwnerHistory(true)}
                                    className="ml-1 p-1 hover:bg-gray-100 rounded"
                                    title="Ver histórico de responsáveis"
                                >
                                    <History className="h-3.5 w-3.5 text-gray-400 hover:text-indigo-600" />
                                </button>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <DollarSign className="h-4 w-4" />
                                <span className="font-semibold text-gray-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_estimado || 0)}
                                </span>
                            </div>
                            {card.data_viagem_inicio && (
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Calendar className="h-4 w-4" />
                                    <span>{new Date(card.data_viagem_inicio).toLocaleDateString('pt-BR')}</span>
                                </div>
                            )}
                            {card.tarefas_pendentes ? (
                                <div className="flex items-center gap-1.5 text-orange-600 shrink-0">
                                    <TrendingUp className="h-4 w-4" />
                                    <span className="font-medium">{card.tarefas_pendentes} tarefa(s) pendente(s)</span>
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
                        <span className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium whitespace-nowrap text-center">
                            {card.etapa_nome}
                        </span>
                        {card.tempo_etapa_dias !== null && card.tempo_etapa_dias !== undefined && (
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                {card.tempo_etapa_dias} dia(s) nesta etapa
                            </span>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 pt-4 border-t">
                        <ActionButtons card={card} />
                    </div>
                </div>
            </div>

            <OwnerHistoryModal
                cardId={card.id!}
                isOpen={showOwnerHistory}
                onClose={() => setShowOwnerHistory(false)}
            />
        </>
    )
}
