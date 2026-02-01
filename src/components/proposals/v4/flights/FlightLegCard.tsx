/**
 * FlightLegCard - Card de um trecho da viagem
 *
 * Design:
 * - Header colapsável com origem → destino
 * - Lista de opções de voo dentro
 * - Botão para adicionar mais opções
 * - Visual claro de IDA/VOLTA
 */

import { useCallback, memo, useState } from 'react'
import {
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
    Plane,
    ArrowRight,
    Calendar,
    Copy
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
    type FlightLeg,
    type FlightOption,
    createEmptyOption,
    formatPrice
} from './types'
import { FlightOptionRow } from './FlightOptionRow'

interface FlightLegCardProps {
    leg: FlightLeg
    onChange: (updates: Partial<FlightLeg>) => void
    onRemove: () => void
    onDuplicate: () => void
}

export const FlightLegCard = memo(function FlightLegCard({
    leg,
    onChange,
    onRemove,
    onDuplicate
}: FlightLegCardProps) {
    const [isExpanded, setIsExpanded] = useState(leg.is_expanded ?? true)

    // Calcular preço mais baixo das opções
    const lowestPrice = leg.options.length > 0
        ? Math.min(...leg.options.map(o => o.price).filter(p => p > 0))
        : 0

    // Handlers para opções
    const handleAddOption = useCallback(() => {
        const newOption = createEmptyOption(leg.options.length)
        onChange({
            options: [...leg.options, newOption]
        })
    }, [leg.options, onChange])

    const handleUpdateOption = useCallback((optionId: string, updates: Partial<FlightOption>) => {
        onChange({
            options: leg.options.map(opt =>
                opt.id === optionId ? { ...opt, ...updates } : opt
            )
        })
    }, [leg.options, onChange])

    const handleRemoveOption = useCallback((optionId: string) => {
        onChange({
            options: leg.options.filter(opt => opt.id !== optionId)
        })
    }, [leg.options, onChange])

    const handleSetRecommended = useCallback((optionId: string) => {
        onChange({
            options: leg.options.map(opt => ({
                ...opt,
                is_recommended: opt.id === optionId
            }))
        })
    }, [leg.options, onChange])

    // Cor do card baseado no tipo
    const legColors = {
        outbound: {
            bg: 'bg-sky-50',
            border: 'border-sky-200',
            header: 'bg-sky-100',
            text: 'text-sky-700',
            icon: 'text-sky-500'
        },
        return: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            header: 'bg-emerald-100',
            text: 'text-emerald-700',
            icon: 'text-emerald-500'
        },
        connection: {
            bg: 'bg-purple-50',
            border: 'border-purple-200',
            header: 'bg-purple-100',
            text: 'text-purple-700',
            icon: 'text-purple-500'
        }
    }[leg.leg_type]

    return (
        <div className={cn("rounded-xl border-2 overflow-hidden", legColors.border, legColors.bg)}>
            {/* Header */}
            <div
                className={cn(
                    "flex items-center gap-3 px-4 py-3 cursor-pointer",
                    legColors.header
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Expand/Collapse */}
                <button className={cn("p-0.5", legColors.text)}>
                    {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                    ) : (
                        <ChevronRight className="h-5 w-5" />
                    )}
                </button>

                {/* Ícone e Label */}
                <div className={cn("flex items-center gap-2", legColors.text)}>
                    <Plane className={cn("h-5 w-5", legColors.icon)} />
                    <span className="font-bold text-sm uppercase tracking-wide">
                        {leg.label}
                    </span>
                </div>

                {/* Rota */}
                <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                        type="text"
                        value={leg.origin_code}
                        onChange={(e) => onChange({ origin_code: e.target.value.toUpperCase() })}
                        placeholder="GRU"
                        maxLength={3}
                        className="w-14 h-8 px-2 text-sm font-bold text-center bg-white border border-slate-200 rounded-md uppercase focus:border-sky-400"
                    />
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        value={leg.destination_code}
                        onChange={(e) => onChange({ destination_code: e.target.value.toUpperCase() })}
                        placeholder="MIA"
                        maxLength={3}
                        className="w-14 h-8 px-2 text-sm font-bold text-center bg-white border border-slate-200 rounded-md uppercase focus:border-emerald-400"
                    />
                </div>

                {/* Data */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <input
                        type="date"
                        value={leg.date}
                        onChange={(e) => onChange({ date: e.target.value })}
                        className="h-8 px-2 text-sm bg-white border border-slate-200 rounded-md focus:border-sky-400"
                    />
                </div>

                {/* Badge de opções */}
                <div className="flex items-center gap-2">
                    {leg.options.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-white rounded-full text-slate-600">
                            {leg.options.length} opç{leg.options.length === 1 ? 'ão' : 'ões'}
                        </span>
                    )}
                    {lowestPrice > 0 && (
                        <span className="px-2 py-0.5 text-xs font-bold bg-white rounded-full text-emerald-600">
                            a partir de {formatPrice(lowestPrice)}
                        </span>
                    )}
                </div>

                {/* Ações do trecho */}
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDuplicate}
                        className="h-8 w-8 text-slate-500 hover:text-slate-700"
                        title="Duplicar trecho"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                        title="Remover trecho"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Conteúdo expandido */}
            {isExpanded && (
                <div className="p-4 space-y-2">
                    {/* Cidades (nomes completos) */}
                    <div className="flex items-center gap-4 mb-3 text-sm text-slate-500">
                        <input
                            type="text"
                            value={leg.origin_city}
                            onChange={(e) => onChange({ origin_city: e.target.value })}
                            placeholder="São Paulo"
                            className="flex-1 h-7 px-2 text-xs bg-white/50 border-0 border-b border-slate-200 focus:border-sky-400 focus:ring-0"
                        />
                        <span className="text-slate-300">→</span>
                        <input
                            type="text"
                            value={leg.destination_city}
                            onChange={(e) => onChange({ destination_city: e.target.value })}
                            placeholder="Miami"
                            className="flex-1 h-7 px-2 text-xs bg-white/50 border-0 border-b border-slate-200 focus:border-emerald-400 focus:ring-0"
                        />
                    </div>

                    {/* Header das colunas */}
                    {leg.options.length > 0 && (
                        <div className="grid grid-cols-[auto_1fr_80px_80px_100px_80px_80px_auto] gap-2 px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <div className="w-12"></div>
                            <div>Companhia / Voo</div>
                            <div className="text-center">Saída</div>
                            <div className="text-center">Chegada</div>
                            <div className="text-center">Classe</div>
                            <div className="text-center">Bagagem</div>
                            <div className="text-right">Preço</div>
                            <div className="w-8"></div>
                        </div>
                    )}

                    {/* Lista de opções */}
                    <div className="space-y-2">
                        {leg.options.map((option) => (
                            <FlightOptionRow
                                key={option.id}
                                option={option}
                                onChange={(updates) => handleUpdateOption(option.id, updates)}
                                onRemove={() => handleRemoveOption(option.id)}
                                onSetRecommended={() => handleSetRecommended(option.id)}
                            />
                        ))}
                    </div>

                    {/* Botão adicionar opção */}
                    <button
                        onClick={handleAddOption}
                        className={cn(
                            "w-full py-3 border-2 border-dashed rounded-lg",
                            "flex items-center justify-center gap-2",
                            "text-sm font-medium transition-all",
                            "hover:border-solid",
                            legColors.border,
                            legColors.text
                        )}
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar Opção de Voo
                    </button>
                </div>
            )}
        </div>
    )
})

export default FlightLegCard
