import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, DollarSign, History, Edit2, Check, X, ChevronDown, AlertCircle, RefreshCw, Clock, Pencil, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'

interface TripsProdutoData {
    orcamento?: {
        // Estrutura antiga (date_range)
        total?: number
        por_pessoa?: number
        // Estrutura nova (smart_budget)
        tipo?: 'total' | 'por_pessoa' | 'range'
        valor?: number
        total_calculado?: number
        display?: string
    }
    epoca_viagem?: {
        // Estrutura antiga (date_range)
        inicio?: string
        fim?: string
        flexivel?: boolean
        // Estrutura nova (flexible_date)
        tipo?: 'data_exata' | 'mes' | 'range_meses' | 'indefinido'
        data_inicio?: string
        data_fim?: string
        mes_inicio?: number
        mes_fim?: number
        ano?: number
        display?: string
    }
    destinos?: Record<string, unknown>[]
}
import OwnerHistoryModal from './OwnerHistoryModal'
import ActionButtons from './ActionButtons'
import { Button } from '../ui/Button'
import UserSelector from './UserSelector'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useQualityGate } from '../../hooks/useQualityGate'
import QualityGateModal from './QualityGateModal'
import StageChangeModal from './StageChangeModal'
import LossReasonModal from './LossReasonModal'
import { useStageRequirements } from '../../hooks/useStageRequirements'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import { usePipelinePhases } from '../../hooks/usePipelinePhases'
import { SystemPhase } from '@/types/pipeline'

type CardBase = Database['public']['Tables']['cards']['Row']

// Extended card type including fields from views (e.g. cards_complete_view)
type Card = CardBase & {
    proxima_tarefa?: { data_vencimento?: string; titulo?: string } | null
    ganho_sdr?: boolean | null
    ganho_planner?: boolean | null
    ganho_pos?: boolean | null
    motivo_perda_id?: string | null
    motivo_perda_comentario?: string | null
}

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
    const { validateMoveSync } = useQualityGate()
    const [qualityGateModalOpen, setQualityGateModalOpen] = useState(false)
    const [stageChangeModalOpen, setStageChangeModalOpen] = useState(false)
    const [pendingStageChange, setPendingStageChange] = useState<{
        stageId: string,
        targetStageName: string,
        missingFields?: { key: string, label: string }[],
        currentOwnerId?: string,
        sdrName?: string
    } | null>(null)

    const [lossReasonModalOpen, setLossReasonModalOpen] = useState(false)
    const [pendingLossMove, setPendingLossMove] = useState<{ stageId: string; stageName: string } | null>(null)

    const { missingBlocking } = useStageRequirements(card)
    const { getHeaderFields } = useFieldConfig()
    const headerFields = card.pipeline_stage_id ? getHeaderFields(card.pipeline_stage_id) : []
    const { data: phasesData } = usePipelinePhases()

    // Fetch pipeline stages with proper Kanban ordering (phase order_index -> stage ordem)
    const { data: stages } = useQuery({
        queryKey: ['pipeline-stages-ordered'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select(`
                    id,
                    nome,
                    ordem,
                    fase,
                    phase_id,
                    is_lost,
                    is_won,
                    pipeline_phases!pipeline_stages_phase_id_fkey(id, name, order_index)
                `)
                .eq('ativo', true)

            if (error) throw error

            // Sort by phase order_index first, then by stage ordem within phase
            return (data || []).sort((a, b) => {
                const phaseOrderA = (a.pipeline_phases as { order_index?: number } | null)?.order_index ?? 999
                const phaseOrderB = (b.pipeline_phases as { order_index?: number } | null)?.order_index ?? 999
                if (phaseOrderA !== phaseOrderB) return phaseOrderA - phaseOrderB
                return a.ordem - b.ordem
            }) as { id: string; nome: string; ordem: number; fase: string; is_lost?: boolean; is_won?: boolean }[]
        }
    })

    // Find lost stage for the "Mark as Lost" button
    // Verifica tanto a flag is_lost quanto o nome da stage (fallback)
    const lostStage = stages?.find(s =>
        s.is_lost === true ||
        s.nome?.toLowerCase().includes('perdido') ||
        s.nome?.toLowerCase().includes('lost')
    )

    // Derived fields
    const currentStage = stages?.find(s => s.id === card.pipeline_stage_id)
    const currentFase = currentStage?.fase
    const daysInStage = card.stage_entered_at
        ? Math.floor((new Date().getTime() - new Date(card.stage_entered_at).getTime()) / (1000 * 60 * 60 * 24))
        : null

    useEffect(() => {
        // Sync local title state when card data changes (e.g. after save or refetch)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync of derived state
        setEditedTitle(card.titulo || '')
    }, [card.titulo])

    // Fetch active change requests
    const { data: hasActiveChange } = useQuery({
        queryKey: ['tasks', card.id, 'active-change'],
        queryFn: async () => {
            if (!card.id) return false
            const { data } = await supabase
                .from('tarefas')
                .select('id')
                .eq('card_id', card.id)
                .eq('tipo', 'solicitacao_mudanca')
                .eq('concluida', false)
                .maybeSingle()
            return !!data
        },
        enabled: !!card.id
    })

    // Determine Operational Badge
    const getOperationalBadge = () => {
        // 1. High Priority: Active Change Request
        if (hasActiveChange) {
            return (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-medium">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Mudança ativa
                </div>
            )
        }

        // 2. Task Status Logic
        if (card.proxima_tarefa) {
            const task = card.proxima_tarefa
            if (task.data_vencimento) {
                const today = new Date()
                today.setHours(0, 0, 0, 0)
                const taskDate = new Date(task.data_vencimento)
                taskDate.setHours(0, 0, 0, 0)

                const diffDays = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                // Overdue
                if (diffDays < 0) {
                    const daysLate = Math.abs(diffDays)
                    return (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            Atrasada há {daysLate} dia{daysLate > 1 ? 's' : ''}
                        </div>
                    )
                }

                // Today
                if (diffDays === 0) {
                    return (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-700 text-xs font-medium">
                            <Clock className="h-3.5 w-3.5" />
                            Para hoje
                        </div>
                    )
                }

                // Future
                return (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-medium">
                        <Calendar className="h-3.5 w-3.5" />
                        Para daqui a {diffDays} dia{diffDays > 1 ? 's' : ''}
                    </div>
                )
            }
        }

        // 3. Warning: No Next Task
        return (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                Sem próxima tarefa
            </div>
        )
    }

    // Fetch pipeline stages


    const getPhaseColor = (phaseName: string | null | undefined) => {
        if (!phaseName) return 'bg-gray-600 text-white'
        const phase = phasesData?.find(p => p.name === phaseName)
        // If we have a phase color (e.g. bg-blue-600), we use it. 
        // If not found, fallback to gray.
        return phase?.color ? `${phase.color} text-white` : 'bg-gray-600 text-white'
    }

    const getPhaseBgColor = (phaseName: string | null | undefined) => {
        if (!phaseName) return 'bg-gray-500'
        const phase = phasesData?.find(p => p.name === phaseName)
        // Extract the color name (e.g. blue-500) from bg-blue-500 if possible, or just return the class
        // The DB stores 'bg-blue-600'.
        return phase?.color || 'bg-gray-500'
    }

    // statusColors moved to StatusSelector component

    const updateOwnerMutation = useMutation({
        mutationFn: async ({ field, userId }: { field: 'dono_atual_id' | 'sdr_owner_id' | 'vendas_owner_id' | 'pos_owner_id', userId: string | null }) => {
            const updateData: Partial<CardBase> = { [field]: userId || null }

            const { error } = await supabase.from('cards')
                .update(updateData)
                .eq('id', card.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
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
            const { error } = await supabase.from('cards')
                .update({ titulo: newTitle })
                .eq('id', card.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            queryClient.invalidateQueries({ queryKey: ['activity-feed', card.id] })
            setIsEditingTitle(false)
        }
    })

    const updateStageMutation = useMutation({
        mutationFn: async (stageId: string) => {
            const { error } = await supabase.from('cards')
                .update({ pipeline_stage_id: stageId })
                .eq('id', card.id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            queryClient.invalidateQueries({ queryKey: ['activity-feed', card.id] })
            setShowStageDropdown(false)
        }
    })

    const handleStageSelect = (stageId: string, stageName: string, stageFase: string) => {
        // 1. Validate Move
        const validation = validateMoveSync(card, stageId)

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
        const currentPhase = phasesData?.find(p => p.name === currentFase)
        const targetPhase = phasesData?.find(p => p.name === stageFase)

        const isSdrPhase = currentPhase?.slug === SystemPhase.SDR
        const isTargetSdr = targetPhase?.slug === SystemPhase.SDR

        if (isSdrPhase && stageFase && !isTargetSdr) {
            setPendingStageChange({
                stageId,
                targetStageName: stageName,
                currentOwnerId: card.dono_atual_id || undefined,
                sdrName: card.sdr_owner_id ? 'SDR Atual' : undefined
            })
            setStageChangeModalOpen(true)
            setShowStageDropdown(false)
            return
        }

        // 3. Proceed if valid
        updateStageMutation.mutate(stageId)
    }

    const updateStatusMutation = useMutation({
        mutationFn: async (vars: { status: string, motivoId?: string, comentario?: string }) => {
            const updateData: Partial<CardBase> = { status_comercial: vars.status }

            if (vars.status === 'ganho') {
                updateData.taxa_data_status = new Date().toISOString()
            } else if (vars.status === 'perdido') {
                updateData.motivo_perda_id = vars.motivoId
                updateData.motivo_perda_comentario = vars.comentario
            }

            const { error } = await supabase.from('cards')
                .update(updateData)
                .eq('id', card.id)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['cards'] }) // Refresh lists/analytics
            setLossReasonModalOpen(false)
        },
        onError: (error) => {
            console.error('Failed to update status:', error)
            alert('Erro ao atualizar status: ' + error.message)
        }
    })

    const handleStatusSelect = (newStatus: string) => {
        if (newStatus === 'perdido') {
            setLossReasonModalOpen(true)
        } else {
            updateStatusMutation.mutate({ status: newStatus })
        }
    }

    const handleLossConfirm = async (motivoId: string, comentario: string) => {
        // Check if we're just editing the loss reason (card already in perdido)
        const isJustEditingReason = card.status_comercial === 'perdido' &&
            pendingLossMove?.stageId === card.pipeline_stage_id

        if (isJustEditingReason) {
            // Just update the loss reason fields directly
            const { error } = await supabase
                .from('cards')
                .update({
                    motivo_perda_id: motivoId || null,
                    motivo_perda_comentario: comentario || null
                })
                .eq('id', card.id)

            if (error) {
                console.error('Failed to update loss reason:', error)
                alert('Erro ao atualizar motivo: ' + error.message)
            } else {
                queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
                queryClient.invalidateQueries({ queryKey: ['card', card.id] })
                queryClient.invalidateQueries({ queryKey: ['cards'] })
                queryClient.invalidateQueries({ queryKey: ['loss-reason', motivoId] })
            }

            setPendingLossMove(null)
            setLossReasonModalOpen(false)
        } else if (pendingLossMove) {
            // Move to lost stage via RPC (trigger will set status_comercial='perdido')
            const { error } = await supabase.rpc('mover_card', {
                p_card_id: card.id,
                p_nova_etapa_id: pendingLossMove.stageId,
                p_motivo_perda_id: motivoId || undefined,
                p_motivo_perda_comentario: comentario || undefined
            })

            if (error) {
                console.error('Failed to move card to lost stage:', error)
                alert('Erro ao mover card: ' + error.message)
            } else {
                queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
                queryClient.invalidateQueries({ queryKey: ['card', card.id] })
                queryClient.invalidateQueries({ queryKey: ['cards'] })
            }

            setPendingLossMove(null)
            setLossReasonModalOpen(false)
        } else {
            // Fallback: just update status (legacy behavior)
            updateStatusMutation.mutate({ status: 'perdido', motivoId, comentario })
        }
    }

    const handleMarkAsLost = () => {
        if (lostStage) {
            setPendingLossMove({ stageId: lostStage.id, stageName: lostStage.nome })
            setLossReasonModalOpen(true)
        }
    }

    const handleConfirmQualityGate = () => {
        if (pendingStageChange) {
            setQualityGateModalOpen(false)

            // Check owner change after quality gate
            const targetStage = stages?.find(s => s.id === pendingStageChange.stageId)
            const currentPhase = phasesData?.find(p => p.name === currentFase)
            const targetPhase = phasesData?.find(p => p.name === targetStage?.fase)

            const isSdrPhase = currentPhase?.slug === SystemPhase.SDR
            const isTargetSdr = targetPhase?.slug === SystemPhase.SDR

            if (isSdrPhase && targetStage?.fase && !isTargetSdr) {
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



    const handleSdrSelect = (userId: string | null) => {
        updateOwnerMutation.mutate({ field: 'sdr_owner_id', userId })

        // If current stage is SDR, update current owner too
        const currentPhase = phasesData?.find(p => p.name === currentFase)
        if (currentPhase?.slug === SystemPhase.SDR) {
            updateOwnerMutation.mutate({ field: 'dono_atual_id', userId })
        }
    }

    const handlePlannerSelect = (userId: string | null) => {
        updateOwnerMutation.mutate({ field: 'vendas_owner_id', userId })

        // If current stage is Planner (Vendas), update current owner too
        const currentPhase = phasesData?.find(p => p.name === currentFase)
        if (currentPhase?.slug === SystemPhase.PLANNER) {
            updateOwnerMutation.mutate({ field: 'dono_atual_id', userId })
        }
    }

    const handlePosVendaSelect = (userId: string | null) => {
        updateOwnerMutation.mutate({ field: 'pos_owner_id', userId })

        // If current stage is Pós-Venda, update current owner too
        const currentPhase = phasesData?.find(p => p.name === currentFase)
        if (currentPhase?.slug === SystemPhase.POS_VENDA) {
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
                        <button
                            onClick={() => navigate('/pipeline')}
                            className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs uppercase tracking-wide transition-colors"
                        >
                            {card.produto}
                        </button>
                    </div>

                    {/* Stage Selector & Time in Stage */}
                    <div className="relative z-20 flex items-center gap-3">
                        {daysInStage !== null && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs font-medium text-gray-500" title="Tempo nesta etapa">
                                <History className="h-3 w-3" />
                                {daysInStage}d
                            </div>
                        )}

                        <div className="relative">
                            <button
                                onClick={() => setShowStageDropdown(!showStageDropdown)}
                                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-medium transition-all border border-gray-200 hover:border-gray-300"
                            >
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    getPhaseBgColor(currentFase)
                                )} />
                                {currentStage?.nome || 'Sem Etapa'}
                                <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                            </button>

                            {showStageDropdown && stages && (
                                <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-30">
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
                                                    getPhaseBgColor(stage.fase)
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
                </div>

                {/* Main Content: Title & Actions */}
                <div className="px-4 md:px-6 py-4 md:py-5 flex flex-col gap-4 md:gap-6">
                    {/* Row 1: Title */}
                    <div className="flex-1 min-w-0 space-y-3">
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

                        {/* Metadata Row: Badges | Value | Trip Date */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full font-semibold text-xs uppercase tracking-wide",
                                getPhaseColor(currentFase)
                            )}>
                                {currentFase}
                            </span>

                            {/* Operational Badge */}
                            {getOperationalBadge()}

                            {/* Status Selector */}
                            <StatusSelector
                                currentStatus={card.status_comercial}
                                onSelect={handleStatusSelect}
                            />

                            {/* Marcos do Funil (ganhos por fase) */}
                            {(card.ganho_sdr || card.ganho_planner || card.ganho_pos) && (
                                <div className="flex items-center gap-1" title="Marcos alcançados no funil de vendas">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wide mr-1">Marcos:</span>
                                    {card.ganho_sdr && (
                                        <span
                                            className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 text-[10px] font-medium"
                                            title="Qualificado pelo SDR"
                                        >
                                            SDR
                                        </span>
                                    )}
                                    {card.ganho_planner && (
                                        <span
                                            className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 border border-purple-200 text-[10px] font-medium"
                                            title="Venda fechada - viagem confirmada"
                                        >
                                            Planner
                                        </span>
                                    )}
                                    {card.ganho_pos && (
                                        <span
                                            className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-medium"
                                            title="Viagem concluída com sucesso"
                                        >
                                            Pós
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Mark as Lost Button OR Loss Reason Display */}
                            {card.status_comercial !== 'perdido' && lostStage && (
                                <button
                                    onClick={handleMarkAsLost}
                                    className="px-2 py-0.5 rounded-md border border-red-200 bg-white text-red-600 text-xs font-medium hover:bg-red-50 transition-colors"
                                >
                                    Marcar Perdido
                                </button>
                            )}

                            {/* Loss Reason Display - when card is lost */}
                            {card.status_comercial === 'perdido' && (
                                <LossReasonBadge
                                    motivoId={card.motivo_perda_id}
                                    comentario={card.motivo_perda_comentario}
                                    onClick={() => {
                                        setPendingLossMove({
                                            stageId: card.pipeline_stage_id || '',
                                            stageName: currentStage?.nome || 'Perdido'
                                        })
                                        setLossReasonModalOpen(true)
                                    }}
                                />
                            )}

                            {/* Divider */}
                            <div className="h-4 w-px bg-gray-300 mx-1" />

                            {/* Value - Always show when data exists */}
                            {(() => {
                                // Parse both produto_data and briefing_inicial - priority to produto_data
                                const productData = (typeof card.produto_data === 'string' ? JSON.parse(card.produto_data || '{}') : card.produto_data || {}) as TripsProdutoData
                                const briefingData = (typeof card.briefing_inicial === 'string' ? JSON.parse(card.briefing_inicial || '{}') : card.briefing_inicial || {}) as TripsProdutoData

                                // Merge: produto_data takes priority, fallback to briefing_inicial
                                const mergedData: TripsProdutoData = {
                                    ...briefingData,
                                    ...productData,
                                    // For nested objects, merge them too
                                    orcamento: productData?.orcamento || briefingData?.orcamento,
                                    epoca_viagem: productData?.epoca_viagem || briefingData?.epoca_viagem
                                }

                                // Check for TRIPS (including null/undefined which defaults to TRIPS behavior)
                                if (card.produto === 'TRIPS' || !card.produto) {
                                    const orcamento = mergedData?.orcamento

                                    // Tentar múltiplas fontes de valor (nova e antiga estrutura)
                                    const valorDisplay =
                                        orcamento?.display ||                    // Novo: display pré-formatado
                                        orcamento?.total_calculado ||            // Novo: total calculado
                                        orcamento?.total ||                       // Antigo: total direto
                                        (orcamento?.tipo === 'total' && orcamento?.valor) ||  // Novo: valor quando tipo=total
                                        null

                                    if (valorDisplay) {
                                        // Se já é string formatada (display), usar diretamente
                                        if (typeof valorDisplay === 'string') {
                                            return (
                                                <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                                                    {valorDisplay}
                                                </div>
                                            )
                                        }
                                        // Se é número, formatar
                                        return (
                                            <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDisplay)}
                                            </div>
                                        )
                                    }
                                    return null
                                }

                                if (card.valor_estimado || card.valor_final) {
                                    return (
                                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                            <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                (card.status_comercial === 'ganho' || card.status_comercial === 'perdido')
                                                    ? (card.valor_final || card.valor_estimado || 0)
                                                    : (card.valor_estimado || 0)
                                            )}
                                        </div>
                                    )
                                }
                                return null
                            })()}

                            {/* Receita - Visível para todos */}
                            {card.receita != null && (
                                <>
                                    <div className="h-4 w-px bg-gray-300 mx-1" />
                                    <div
                                        className="flex items-center gap-1.5 text-amber-700 font-medium"
                                        title="Receita/Margem da viagem"
                                    >
                                        <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
                                        {new Intl.NumberFormat('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL'
                                        }).format(card.receita)}
                                        {card.receita_source === 'calculated' && (
                                            <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                                                Auto
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Trip Date - Always show when data exists */}
                            {(() => {
                                let tripDate: Date | null = null

                                // Check for TRIPS (including null/undefined which defaults to TRIPS behavior)
                                if (card.produto === 'TRIPS' || !card.produto) {
                                    // Parse both produto_data and briefing_inicial - priority to produto_data
                                    const productData = (typeof card.produto_data === 'string' ? JSON.parse(card.produto_data || '{}') : card.produto_data || {}) as TripsProdutoData
                                    const briefingData = (typeof card.briefing_inicial === 'string' ? JSON.parse(card.briefing_inicial || '{}') : card.briefing_inicial || {}) as TripsProdutoData

                                    // Merge: produto_data.epoca_viagem takes priority, fallback to briefing_inicial
                                    const epocaViagem = productData?.epoca_viagem || briefingData?.epoca_viagem

                                    // Se tem display pré-formatado (nova estrutura), usar diretamente
                                    if (epocaViagem?.display) {
                                        return (
                                            <>
                                                <div className="h-4 w-px bg-gray-300 mx-1" />
                                                <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                    {epocaViagem.display}
                                                </div>
                                                {epocaViagem.flexivel && (
                                                    <span className="text-xs text-amber-600 px-1.5 py-0.5 bg-amber-50 rounded">📌 Flexível</span>
                                                )}
                                            </>
                                        )
                                    }

                                    // Tentar múltiplas fontes de data (nova e antiga estrutura)
                                    const dataStr =
                                        epocaViagem?.data_inicio ||      // Novo: flexible_date
                                        epocaViagem?.inicio ||           // Antigo: date_range
                                        null

                                    if (dataStr) {
                                        // Preferir coluna sincronizada se disponível
                                        if (card.data_viagem_inicio) {
                                            tripDate = new Date(card.data_viagem_inicio + 'T12:00:00')
                                        } else {
                                            tripDate = new Date(dataStr + 'T12:00:00')
                                        }
                                    }
                                } else if (card.data_viagem_inicio) {
                                    tripDate = new Date(card.data_viagem_inicio + 'T12:00:00')
                                }

                                if (tripDate && !isNaN(tripDate.getTime())) {
                                    const daysToTrip = Math.floor((tripDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                    return (
                                        <>
                                            <div className="h-4 w-px bg-gray-300 mx-1" />
                                            <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                {tripDate.getDate()} de {tripDate.toLocaleString('pt-BR', { month: 'short' })}
                                                <span className="text-gray-400 ml-0.5">'{tripDate.getFullYear().toString().slice(2)}</span>
                                            </div>
                                            {daysToTrip >= 0 && (
                                                <div className={cn(
                                                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                    daysToTrip < 14 ? "bg-red-50 text-red-700 border border-red-200" :
                                                        daysToTrip < 30 ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                                            "bg-blue-50 text-blue-700 border border-blue-200"
                                                )}>
                                                    ✈️ {daysToTrip}d
                                                </div>
                                            )}
                                        </>
                                    )
                                }
                                return null
                            })()}

                            {/* Extra Dynamic Header Fields from config */}
                            {headerFields.filter(f => !['orcamento', 'valor_estimado', 'epoca_viagem', 'data_viagem_inicio'].includes(f.key)).map(field => {
                                let value = card[field.key as keyof Card]

                                if (card.produto === 'TRIPS' && !value) {
                                    const productData = (typeof card.produto_data === 'string' ? JSON.parse(card.produto_data) : card.produto_data) as Record<string, unknown> | null
                                    value = productData?.[field.key] as typeof value
                                }

                                if (!value) return null

                                let displayValue: string
                                if (Array.isArray(value)) displayValue = value.join(', ')
                                else if (typeof value === 'boolean') displayValue = value ? 'Sim' : 'Não'
                                else displayValue = String(value)

                                return (
                                    <div key={field.key} className="flex items-center gap-2">
                                        <div className="h-4 w-px bg-gray-300 mx-1" />
                                        <div className="flex items-center gap-1.5 text-gray-600 font-medium" title={field.label}>
                                            <span className="text-gray-400 text-xs uppercase font-bold">{field.label}:</span>
                                            {displayValue}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Row 2: Owners & Actions */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-2 border-t border-gray-100">
                        {/* Owner Selectors */}
                        <div className="flex flex-wrap items-center gap-3 md:gap-4">
                            {/* SDR Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 md:w-auto">SDR</span>
                                <UserSelector
                                    currentUserId={card.sdr_owner_id}
                                    onSelect={handleSdrSelect}
                                />
                            </div>

                            <div className="hidden md:block h-6 w-px bg-gray-200" />

                            {/* Planner Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 md:w-auto">Planner</span>
                                <UserSelector
                                    currentUserId={card.vendas_owner_id}
                                    onSelect={handlePlannerSelect}
                                />
                            </div>

                            <div className="hidden md:block h-6 w-px bg-gray-200" />

                            {/* Pós-Venda Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-12 md:w-auto">Pós</span>
                                <UserSelector
                                    currentUserId={card.pos_owner_id}
                                    onSelect={handlePosVendaSelect}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                            {missingBlocking.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setQualityGateModalOpen(true)}
                                    className="gap-2 text-red-600 border-red-200 bg-red-50"
                                >
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="hidden sm:inline">{missingBlocking.length}</span> Pendências
                                </Button>
                            )}
                            <ActionButtons card={card} />
                        </div>
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

            <QualityGateModal
                isOpen={qualityGateModalOpen}
                onClose={() => setQualityGateModalOpen(false)}
                missingFields={pendingStageChange?.missingFields || []}
                onConfirm={handleConfirmQualityGate}
                targetStageName={pendingStageChange?.targetStageName || ''}
                cardId={card.id!}
            />

            <StageChangeModal
                isOpen={stageChangeModalOpen}
                onClose={() => setStageChangeModalOpen(false)}
                onConfirm={handleConfirmStageChange}
                targetStageName={pendingStageChange?.targetStageName || ''}
                currentOwnerId={pendingStageChange?.currentOwnerId || null}
                sdrName={pendingStageChange?.sdrName}
            />

            <LossReasonModal
                isOpen={lossReasonModalOpen}
                onClose={() => {
                    setLossReasonModalOpen(false)
                    setPendingLossMove(null)
                }}
                onConfirm={handleLossConfirm}
                targetStageId={pendingLossMove?.stageId || card.pipeline_stage_id || ''}
                targetStageName={pendingLossMove?.stageName || 'Perdido'}
                initialMotivoId={card.motivo_perda_id}
                initialComentario={card.motivo_perda_comentario}
                isEditing={card.status_comercial === 'perdido'}
            />
        </>
    )
}

function LossReasonBadge({ motivoId, comentario, onClick }: { motivoId?: string | null, comentario?: string | null, onClick?: () => void }) {
    const { data: motivo } = useQuery({
        queryKey: ['loss-reason', motivoId],
        queryFn: async () => {
            if (!motivoId) return null
            const { data, error } = await supabase
                .from('motivos_perda')
                .select('nome')
                .eq('id', motivoId)
                .single()
            if (error) return null
            return data
        },
        enabled: !!motivoId,
        staleTime: 1000 * 60 * 60 // 1 hour cache
    })

    const baseClasses = "flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs font-medium transition-all"
    const clickableClasses = onClick ? "cursor-pointer hover:bg-red-100 hover:border-red-300 hover:shadow-sm" : ""

    if (!motivoId && !comentario) {
        return (
            <button
                onClick={onClick}
                className={`${baseClasses} ${clickableClasses}`}
                title="Clique para informar o motivo da perda"
            >
                <AlertCircle className="h-3 w-3" />
                <span>Sem motivo informado</span>
                {onClick && <Pencil className="h-3 w-3 ml-0.5 opacity-60" />}
            </button>
        )
    }

    const displayText = motivo?.nome || comentario
    const tooltipText = comentario && motivo?.nome ? `Comentário: ${comentario}` : (comentario || 'Clique para editar')

    return (
        <button
            onClick={onClick}
            className={`${baseClasses} ${clickableClasses} max-w-[200px]`}
            title={tooltipText}
        >
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{displayText}</span>
            {onClick && <Pencil className="h-3 w-3 ml-0.5 opacity-60 flex-shrink-0" />}
        </button>
    )
}

function StatusSelector({ currentStatus, onSelect }: { currentStatus: string | null, onSelect: (status: string) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    // Note: 'perdido' removed - use "Marcar como Perdido" button instead (moves to lost stage)
    const statusOptions = [
        { value: 'aberto', label: 'Em Aberto', color: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200' },
        { value: 'pausado', label: 'Pausado', color: 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200' }
    ]

    const statusColors: Record<string, string> = {
        'aberto': 'bg-yellow-100 text-yellow-800 border-yellow-200',
        'ganho': 'bg-green-100 text-green-800 border-green-200',
        'perdido': 'bg-red-100 text-red-800 border-red-200',
        'pausado': 'bg-gray-100 text-gray-800 border-gray-300'
    }

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "px-2.5 py-0.5 rounded-md border text-xs font-medium uppercase tracking-wide flex items-center gap-1 hover:brightness-95 transition-all",
                    statusColors[currentStatus?.toLowerCase() as keyof typeof statusColors] || statusColors['aberto']
                )}
            >
                {currentStatus?.replace('_', ' ') || 'Em Aberto'}
                <ChevronDown className="h-3 w-3 opacity-50" />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        {statusOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onSelect(option.value)
                                    setIsOpen(false)
                                }}
                                className={cn(
                                    "w-full px-3 py-2 text-left text-xs font-medium uppercase tracking-wide transition-colors flex items-center justify-between",
                                    option.value === currentStatus ? "bg-gray-50" : "hover:bg-gray-50",
                                    option.color.split(' ').filter(c => c.startsWith('text-')).join(' ') // Keep text color
                                )}
                            >
                                {option.label}
                                {option.value === currentStatus && <Check className="h-3 w-3" />}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
