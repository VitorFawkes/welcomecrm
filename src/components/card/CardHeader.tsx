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
import { useQualityGate } from '../../hooks/useQualityGate'
import QualityGateModal from './QualityGateModal'
import StageChangeModal from './StageChangeModal'

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
    const { validateMove } = useQualityGate()
    const [qualityGateModalOpen, setQualityGateModalOpen] = useState(false)
    const [stageChangeModalOpen, setStageChangeModalOpen] = useState(false)
    const [pendingStageChange, setPendingStageChange] = useState<{
        stageId: string,
        targetStageName: string,
        missingFields?: { key: string, label: string }[],
        currentOwnerId?: string,
        sdrName?: string
    } | null>(null)

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
        'pausado': 'bg-gray-100 text-gray-800 border-gray-300'
    }

    const updateOwnerMutation = useMutation({
        mutationFn: async ({ field, userId }: { field: 'dono_atual_id' | 'sdr_owner_id', userId: string | null }) => {
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

    const handleStageSelect = (stageId: string, stageName: string, stageFase: string) => {
        // 1. Validate Move
        const validation = validateMove(card, stageId)
        if (!validation.valid) {
            setPendingStageChange({
                stageId,
                targetStageName: stageName,
                missingFields: validation.missingFields
            })
            setQualityGateModalOpen(true)
            setShowStageDropdown(false)
            return
        }

        // 2. Check Owner Change (SDR -> Planner)
        if (card.fase === 'SDR' && stageFase && stageFase !== 'SDR') {
            setPendingStageChange({
                stageId,
                targetStageName: stageName,
                currentOwnerId: card.dono_atual_id,
                sdrName: card.sdr_owner_id ? 'SDR Atual' : undefined
            })
            setStageChangeModalOpen(true)
            setShowStageDropdown(false)
            return
        }

        // 3. Proceed if valid
        updateStageMutation.mutate(stageId)
    }

    const handleConfirmQualityGate = () => {
        if (pendingStageChange) {
            setQualityGateModalOpen(false)

            // Check owner change after quality gate
            const targetStage = stages?.find(s => s.id === pendingStageChange.stageId)
            if (card.fase === 'SDR' && targetStage?.fase && targetStage.fase !== 'SDR') {
                setStageChangeModalOpen(true)
            } else {
                updateStageMutation.mutate(pendingStageChange.stageId)
                setPendingStageChange(null)
            }
        }
    }

    const handleConfirmStageChange = (newOwnerId: string) => {
        if (pendingStageChange) {
            updateOwnerMutation.mutate({ field: 'dono_atual_id', userId: newOwnerId })
            updateStageMutation.mutate(pendingStageChange.stageId)
            setStageChangeModalOpen(false)
            setPendingStageChange(null)
        }
    }

    const handleOwnerSelect = (userId: string | null) => {
        updateOwnerMutation.mutate({ field: 'dono_atual_id', userId })
        if (card.fase === 'SDR') {
            updateOwnerMutation.mutate({ field: 'sdr_owner_id', userId })
        }
    }

    const handleSdrSelect = (userId: string | null) => {
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
            <div className="flex flex-col bg-white border-b border-gray-200 shadow-sm">
                {/* Top Bar: Breadcrumbs & Stage */}
                <div className="px-6 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <button onClick={() => navigate(-1)} className="hover:text-gray-900 flex items-center gap-1 transition-colors">
                            <ArrowLeft className="h-4 w-4" /> Voltar
                        </button>
                        <span className="text-gray-300">/</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-xs uppercase tracking-wide">
                            {card.produto}
                        </span>
                    </div>

                    {/* Stage Selector */}
                    <div className="relative z-20">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowStageDropdown(!showStageDropdown)}
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-all border border-gray-200 hover:border-gray-300"
                            >
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    card.fase === 'SDR' ? 'bg-blue-500' :
                                        card.fase === 'Planner' ? 'bg-purple-500' :
                                            card.fase === 'Pós-venda' ? 'bg-green-500' : 'bg-gray-500'
                                )} />
                                {card.etapa_nome || stages?.find(s => s.id === card.pipeline_stage_id)?.nome || 'Sem Etapa'}
                                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </button>

                            {card.tempo_etapa_dias !== null && card.tempo_etapa_dias !== undefined && (
                                <span className="text-xs text-gray-400">
                                    {card.tempo_etapa_dias}d nesta etapa
                                </span>
                            )}
                        </div>

                        {showStageDropdown && stages && (
                            <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                <div className="max-h-[300px] overflow-y-auto">
                                    {stages.map((stage) => (
                                        <button
                                            key={stage.id}
                                            onClick={() => handleStageSelect(stage.id, stage.nome, stage.fase)}
                                            className={cn(
                                                "w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors",
                                                card.pipeline_stage_id === stage.id && "bg-indigo-50 text-indigo-700 font-medium"
                                            )}
                                        >
                                            <span className={cn(
                                                "w-2.5 h-2.5 rounded-full shrink-0",
                                                stage.fase === 'SDR' ? 'bg-blue-500' :
                                                    stage.fase === 'Planner' ? 'bg-purple-500' :
                                                        stage.fase === 'Pós-venda' ? 'bg-green-500' : 'bg-gray-500'
                                            )} />
                                            <span className="truncate">{stage.nome}</span>
                                            {card.pipeline_stage_id === stage.id && (
                                                <Check className="h-4 w-4 ml-auto shrink-0" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content: Title & Actions */}
                <div className="px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-start gap-3">
                            {isEditingTitle ? (
                                <div className="flex items-center gap-2 flex-1 max-w-2xl">
                                    <input
                                        type="text"
                                        value={editedTitle}
                                        onChange={(e) => setEditedTitle(e.target.value)}
                                        onKeyDown={handleTitleKeyDown}
                                        className="flex-1 text-3xl font-bold text-gray-900 border-b-2 border-indigo-500 bg-transparent outline-none px-1 py-1"
                                        autoFocus
                                    />
                                    <div className="flex gap-1">
                                        <button onClick={handleTitleSave} className="p-2 bg-green-100 hover:bg-green-200 rounded-lg text-green-700 transition-colors">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingTitle(false)
                                                setEditedTitle(card.titulo || '')
                                            }}
                                            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="group flex items-center gap-3">
                                    <h1
                                        onClick={() => setIsEditingTitle(true)}
                                        className="text-3xl font-bold text-gray-900 truncate cursor-pointer hover:text-indigo-900 transition-colors"
                                        title={card.titulo || ''}
                                    >
                                        {card.titulo}
                                    </h1>
                                    <Edit2
                                        onClick={() => setIsEditingTitle(true)}
                                        className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:text-indigo-600"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full font-semibold text-xs uppercase tracking-wide",
                                phaseColors[card.fase as keyof typeof phaseColors] || phaseColors['Outro']
                            )}>
                                {card.fase}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-xs font-medium uppercase tracking-wide">
                                {card.etapa_nome || stages?.find(s => s.id === card.pipeline_stage_id)?.nome || 'Sem Etapa'}
                            </span>
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-md border text-xs font-medium uppercase tracking-wide",
                                statusColors[card.status_comercial?.toLowerCase() as keyof typeof statusColors] || statusColors['aberto']
                            )}>
                                {card.status_comercial?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="shrink-0">
                        <ActionButtons card={card} />
                    </div>
                </div>

                {/* Meta Bar: Details Grid */}
                <div className="px-6 py-3 bg-gray-50/80 border-t border-gray-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-center text-sm">
                    {/* People Section */}
                    <div className="md:col-span-5 flex items-center gap-6">
                        <div className="flex items-center gap-3 min-w-[180px]">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider w-10">Dono</span>
                            <div className="flex-1 flex items-center gap-2">
                                <UserSelector
                                    currentUserId={card.dono_atual_id}
                                    onSelect={handleOwnerSelect}
                                />
                                <button
                                    onClick={() => setShowOwnerHistory(true)}
                                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                    title="Histórico"
                                >
                                    <History className="h-3.5 w-3.5 text-gray-400" />
                                </button>
                            </div>
                        </div>

                        <div className="w-px h-8 bg-gray-200 hidden md:block" />

                        <div className="flex items-center gap-3 min-w-[180px]">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider w-8">SDR</span>
                            <div className="flex-1 flex items-center gap-2">
                                <UserSelector
                                    currentUserId={card.sdr_owner_id}
                                    onSelect={handleSdrSelect}
                                />
                                {card.fase === 'SDR' && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap" title="Sincronizado com Dono">
                                        AUTO
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Data Section */}
                    <div className="md:col-span-7 flex items-center justify-start md:justify-end gap-6 md:gap-8 text-gray-600">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <div className="flex flex-col">
                                <span className="text-[10px] font-medium text-gray-400 uppercase leading-none">Valor</span>
                                <span className="font-semibold text-gray-900">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_final || card.valor_estimado || 0)}
                                </span>
                            </div>
                        </div>

                        {card.data_viagem_inicio && (
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-medium text-gray-400 uppercase leading-none">Viagem</span>
                                    <span className="font-medium text-gray-900">
                                        {new Intl.NumberFormat('pt-BR').format(new Date(card.data_viagem_inicio).getDate())} de {new Date(card.data_viagem_inicio).toLocaleString('pt-BR', { month: 'short' })}
                                        <span className="text-gray-400 ml-1">'{new Date(card.data_viagem_inicio).getFullYear().toString().slice(2)}</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        {card.tarefas_pendentes ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg border border-orange-100">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-semibold text-sm">{card.tarefas_pendentes}</span>
                                <span className="text-xs opacity-80">pendências</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg border border-green-100 opacity-60">
                                <Check className="h-4 w-4" />
                                <span className="text-xs font-medium">Tudo em dia</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Close dropdown when clicking outside */}
            {showStageDropdown && (
                <div
                    className="fixed inset-0 z-10"
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
