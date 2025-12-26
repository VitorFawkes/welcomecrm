import { useState, useEffect } from 'react'
import { ArrowLeft, Calendar, DollarSign, History, Edit2, Check, X, ChevronDown, AlertCircle, RefreshCw, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'

interface TripsProdutoData {
    orcamento?: {
        total?: number
    }
    epoca_viagem?: {
        inicio?: string
    }
    destinos?: any[]
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
import { useStageRequirements } from '../../hooks/useStageRequirements'
import { useFieldConfig } from '../../hooks/useFieldConfig'

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

    const { missingBlocking } = useStageRequirements(card)
    const { getHeaderFields } = useFieldConfig()
    const headerFields = card.pipeline_stage_id ? getHeaderFields(card.pipeline_stage_id) : []

    useEffect(() => {
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
            const task = card.proxima_tarefa as any
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
            const { error } = await (supabase.from('cards') as any)
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
            const { error } = await (supabase.from('cards') as any)
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
                        <button
                            onClick={() => navigate('/pipeline')}
                            className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium text-xs uppercase tracking-wide transition-colors"
                        >
                            {card.produto}
                        </button>
                    </div>

                    {/* Stage Selector & Time in Stage */}
                    <div className="relative z-20 flex items-center gap-3">
                        {card.tempo_etapa_dias !== null && card.tempo_etapa_dias !== undefined && (
                            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-50 border border-gray-200 text-xs font-medium text-gray-500" title="Tempo nesta etapa">
                                <History className="h-3 w-3" />
                                {card.tempo_etapa_dias}d
                            </div>
                        )}

                        <div className="relative">
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
                </div>

                {/* Main Content: Title & Actions */}
                <div className="px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
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
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <span className={cn(
                                "px-2.5 py-0.5 rounded-full font-semibold text-xs uppercase tracking-wide",
                                phaseColors[card.fase as keyof typeof phaseColors] || phaseColors['Outro']
                            )}>
                                {card.fase}
                            </span>

                            {/* Operational Badge */}
                            {getOperationalBadge()}

                            <span className={cn(
                                "px-2.5 py-0.5 rounded-md border text-xs font-medium uppercase tracking-wide",
                                statusColors[card.status_comercial?.toLowerCase() as keyof typeof statusColors] || statusColors['aberto']
                            )}>
                                {card.status_comercial?.replace('_', ' ')}
                            </span>

                            {/* Divider */}
                            <div className="h-4 w-px bg-gray-300 mx-1" />

                            {/* Dynamic Header Fields - Concept Based Rendering */}
                            {(() => {
                                // 1. Budget Concept (Prioritize 'orcamento' then 'valor_estimado')
                                const budgetField = headerFields.find(f => f.key === 'orcamento') || headerFields.find(f => f.key === 'valor_estimado')

                                // 2. Date Concept (Prioritize 'epoca_viagem' then 'data_viagem_inicio')
                                const dateField = headerFields.find(f => f.key === 'epoca_viagem') || headerFields.find(f => f.key === 'data_viagem_inicio')

                                // 3. Universal Fields (Everything else configured for header)
                                const conceptKeys = ['orcamento', 'valor_estimado', 'epoca_viagem', 'data_viagem_inicio']
                                const extraFields = headerFields.filter(f => !conceptKeys.includes(f.key))

                                // Helper: Deterministic Date Formatter (No Timezone Math)
                                const formatDateDeterministic = (dateStr: string, includeYear = false) => {
                                    if (!dateStr || dateStr.length < 10) return ''
                                    const yyyy = dateStr.substring(0, 4)
                                    const mm = parseInt(dateStr.substring(5, 7)) - 1 // 0-indexed
                                    const dd = parseInt(dateStr.substring(8, 10))
                                    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

                                    let res = `${dd} ${months[mm]}`
                                    if (includeYear) res += ` '${yyyy.slice(2)}`
                                    return res
                                }

                                return (
                                    <>
                                        {/* Budget Slot */}
                                        {budgetField && (() => {
                                            let value = 0
                                            if (card.produto === 'TRIPS') {
                                                const productData = (typeof card.produto_data === 'string' ? JSON.parse(card.produto_data) : card.produto_data) as TripsProdutoData
                                                value = productData?.orcamento?.total || 0
                                            } else {
                                                value = (card.status_comercial === 'ganho' || card.status_comercial === 'perdido')
                                                    ? (card.valor_final || card.valor_estimado || 0)
                                                    : (card.valor_estimado || 0)
                                            }

                                            if (!value && !budgetField.isVisible) return null

                                            return (
                                                <div key="concept-budget" className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                                </div>
                                            )
                                        })()}

                                        {/* Date Slot (Deterministic) */}
                                        {dateField && (() => {
                                            let startStr = ''
                                            let endStr = ''
                                            let textValue = ''
                                            let daysToTrip = null

                                            if (card.produto === 'TRIPS') {
                                                const productData = (typeof card.produto_data === 'string' ? JSON.parse(card.produto_data) : card.produto_data) as any

                                                // Object format
                                                if (productData?.epoca_viagem?.inicio) {
                                                    startStr = productData.epoca_viagem.inicio
                                                    endStr = productData.epoca_viagem.fim
                                                }
                                                // String format
                                                else if (typeof productData?.epoca_viagem === 'string') {
                                                    textValue = productData.epoca_viagem
                                                }
                                            }

                                            // Fallback to column
                                            if (!startStr && !textValue && card.data_viagem_inicio) {
                                                startStr = card.data_viagem_inicio
                                                endStr = card.data_viagem_fim || ''
                                            }

                                            // Calculate Countdown (still needs Date object, but only for diff)
                                            if (startStr) {
                                                // Use noon to be safe for countdown calc
                                                const dateObj = new Date(startStr.substring(0, 10) + 'T12:00:00')
                                                if (!isNaN(dateObj.getTime())) {
                                                    daysToTrip = Math.floor((dateObj.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                                                }
                                            }

                                            if (startStr) {
                                                return (
                                                    <div key="concept-date" className="flex items-center gap-2">
                                                        <div className="h-4 w-px bg-gray-300 mx-1" />
                                                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                            {formatDateDeterministic(startStr)}
                                                            {endStr && ` - ${formatDateDeterministic(endStr, true)}`}
                                                            {!endStr && ` '${startStr.substring(2, 4)}`}
                                                        </div>
                                                        {daysToTrip !== null && daysToTrip >= 0 && (
                                                            <div className={cn(
                                                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                                daysToTrip < 14 ? "bg-red-50 text-red-700 border border-red-200" :
                                                                    daysToTrip < 30 ? "bg-orange-50 text-orange-700 border border-orange-200" :
                                                                        "bg-blue-50 text-blue-700 border border-blue-200"
                                                            )}>
                                                                ✈️ {daysToTrip}d
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }

                                            if (textValue) {
                                                return (
                                                    <div key="concept-date-text" className="flex items-center gap-2">
                                                        <div className="h-4 w-px bg-gray-300 mx-1" />
                                                        <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                                                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                            {textValue}
                                                        </div>
                                                    </div>
                                                )
                                            }

                                            return null
                                        })()}

                                        {/* Universal Extra Fields Loop */}
                                        {extraFields.map(field => {
                                            let value = (card as any)[field.key]

                                            // Handle JSON fields if needed (e.g. TRIPS data)
                                            if (card.produto === 'TRIPS' && !value) {
                                                const productData = (typeof card.produto_data === 'string' ? JSON.parse(card.produto_data) : card.produto_data) as any
                                                value = productData?.[field.key]
                                            }

                                            if (!value) return null

                                            // Format value based on type
                                            let displayValue = value
                                            if (Array.isArray(value)) displayValue = value.join(', ')
                                            if (typeof value === 'boolean') displayValue = value ? 'Sim' : 'Não'

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
                                    </>
                                )
                            })()}
                        </div>
                    </div>

                    {/* Right Side: Owners & Actions */}
                    <div className="shrink-0 flex items-center gap-4">
                        {/* Owner Selectors - Horizontal Layout */}
                        <div className="flex items-center gap-4 pr-4 border-r border-gray-200">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Dono</span>
                                <UserSelector
                                    currentUserId={card.dono_atual_id}
                                    onSelect={handleOwnerSelect}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SDR</span>
                                <UserSelector
                                    currentUserId={card.sdr_owner_id}
                                    onSelect={handleSdrSelect}
                                />
                            </div>
                        </div>

                        {missingBlocking.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQualityGateModalOpen(true)}
                                className="gap-2 text-red-600 border-red-200 bg-red-50"
                            >
                                <AlertCircle className="h-4 w-4" />
                                {missingBlocking.length} Pendências
                            </Button>
                        )}
                        <ActionButtons card={card} />
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
        </>
    )
}
