import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, DollarSign, TrendingUp, History, Edit2, Check, X, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'
import OwnerHistoryModal from './OwnerHistoryModal'
import ActionButtons from './ActionButtons'
import UserSelector from './UserSelector'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface CardHeaderProps {
    card: Card
}

export default function CardHeader({ card }: CardHeaderProps) {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [showOwnerHistory, setShowOwnerHistory] = useState(false)

    // Title editing
    const [isEditingTitle, setIsEditingTitle] = useState(false)
    const [editedTitle, setEditedTitle] = useState(card.titulo || '')

    // Stage selection
    const [showStageDropdown, setShowStageDropdown] = useState(false)

    useEffect(() => {
        setEditedTitle(card.titulo || '')
    }, [card.titulo])

    // Fetch pipeline stages
    const { data: stages } = useQuery({
        queryKey: ['pipeline-stages'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('id, nome, ordem, fase')
                .order('ordem')
            if (error) throw error
            return data as { id: string; nome: string; ordem: number; fase: string }[]
        }
    })

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

    const updateOwnerMutation = useMutation({
        mutationFn: async ({ field, userId }: { field: 'dono_atual_id' | 'sdr_owner_id', userId: string }) => {
            const updateData: any = {}
            updateData[field] = userId || null

            const { error } = await (supabase.from('cards') as any)
                .update(updateData)
                .eq('id', card.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            queryClient.invalidateQueries({ queryKey: ['activity-feed', card.id] })
        },
        onError: (error) => {
            console.error('Failed to update owner:', error)
            alert('Erro ao atualizar responsável: ' + error.message)
        }
    })

    const updateTitleMutation = useMutation({
        mutationFn: async (newTitle: string) => {
            const { error } = await (supabase.from('cards') as any)
                .update({ titulo: newTitle })
                .eq('id', card.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            queryClient.invalidateQueries({ queryKey: ['activity-feed', card.id] })
            setIsEditingTitle(false)
        }
    })

    const updateStageMutation = useMutation({
        mutationFn: async (stageId: string) => {
            const { error } = await (supabase.from('cards') as any)
                .update({ pipeline_stage_id: stageId })
                .eq('id', card.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            queryClient.invalidateQueries({ queryKey: ['activity-feed', card.id] })
            setShowStageDropdown(false)
        }
    })

    const handleOwnerSelect = (userId: string) => {
        updateOwnerMutation.mutate({ field: 'dono_atual_id', userId })
        if (card.fase === 'SDR') {
            updateOwnerMutation.mutate({ field: 'sdr_owner_id', userId })
        }
    }

    const handleSdrSelect = (userId: string) => {
        updateOwnerMutation.mutate({ field: 'sdr_owner_id', userId })
        if (card.fase === 'SDR') {
            updateOwnerMutation.mutate({ field: 'dono_atual_id', userId })
        }
    }

    const handleTitleSave = () => {
        if (editedTitle.trim() && editedTitle !== card.titulo) {
            updateTitleMutation.mutate(editedTitle.trim())
        } else {
            setIsEditingTitle(false)
            setEditedTitle(card.titulo || '')
        }
    }

    const handleTitleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleTitleSave()
        }
        if (e.key === 'Escape') {
            setIsEditingTitle(false)
            setEditedTitle(card.titulo || '')
        }
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
                            {/* Editable Title */}
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        onKeyDown={handleTitleKeyDown}
                                        className="flex-1 text-2xl font-bold text-gray-900 border-b-2 border-indigo-500 bg-transparent outline-none px-1"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleTitleSave}
                                        className="p-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-green-700"
                                    >
                                        <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditingTitle(false)
                                            setEditedTitle(card.titulo || '')
                                        }}
                                        className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="flex items-center gap-2 group cursor-pointer"
                                    onClick={() => setIsEditingTitle(true)}
                                >
                                    <h1 className="text-2xl font-bold text-gray-900 truncate max-w-full" title={card.titulo || ''}>
                                        {card.titulo}
                                    </h1>
                                    <Edit2 className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            )}

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
                            <div className="flex items-center gap-4 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <UserSelector
                                        currentUserId={card.dono_atual_id}
                                        onSelect={handleOwnerSelect}
                                        label="Dono"
                                    />
                                    <button
                                        onClick={() => setShowOwnerHistory(true)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                        title="Ver histórico de responsáveis"
                                    >
                                        <History className="h-3.5 w-3.5 text-gray-400 hover:text-indigo-600" />
                                    </button>
                                </div>

                                <div className="w-px h-8 bg-gray-200 mx-2"></div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <UserSelector
                                        currentUserId={card.sdr_owner_id}
                                        onSelect={handleSdrSelect}
                                        label="SDR"
                                    />
                                    {card.fase === 'SDR' && (
                                        <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100" title="Na fase SDR, o Dono e o SDR são sincronizados automaticamente.">
                                            Auto-sync
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 border-l pl-4 border-gray-200">
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

                    {/* Stage Selector */}
                    <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0 relative">
                        <button
                            onClick={() => setShowStageDropdown(!showStageDropdown)}
                            className="px-3 py-1 rounded-md bg-gray-100 text-gray-700 text-sm font-medium whitespace-nowrap text-center hover:bg-gray-200 transition-colors flex items-center gap-1"
                        >
                            {card.etapa_nome}
                            <ChevronDown className="h-4 w-4" />
                        </button>

                        {showStageDropdown && stages && (
                            <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
                                {stages.map((stage) => (
                                    <button
                                        key={stage.id}
                                        onClick={() => updateStageMutation.mutate(stage.id)}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2",
                                            card.pipeline_stage_id === stage.id && "bg-indigo-50 text-indigo-700"
                                        )}
                                    >
                                        <span className={cn(
                                            "w-2 h-2 rounded-full",
                                            stage.fase === 'SDR' ? 'bg-blue-500' :
                                                stage.fase === 'Planner' ? 'bg-purple-500' :
                                                    stage.fase === 'Pós-venda' ? 'bg-green-500' : 'bg-gray-500'
                                        )} />
                                        {stage.nome}
                                        {card.pipeline_stage_id === stage.id && (
                                            <Check className="h-4 w-4 ml-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}

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

            {/* Close dropdown when clicking outside */}
            {showStageDropdown && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowStageDropdown(false)}
                />
            )}

            <OwnerHistoryModal
                cardId={card.id!}
                isOpen={showOwnerHistory}
                onClose={() => setShowOwnerHistory(false)}
            />
        </>
    )
}
