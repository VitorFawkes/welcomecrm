import { useState } from 'react'
import type { ProposalItemWithOptions } from '@/types/proposals'
import { ITEM_TYPE_CONFIG } from '@/types/proposals'
import { Check, ChevronDown, ChevronUp } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

interface SelectableItemCardProps {
    item: ProposalItemWithOptions
    isSelected: boolean
    selectedOptionId?: string
    onToggle: () => void
    onSelectOption: (optionId: string) => void
}

export function SelectableItemCard({
    item,
    isSelected,
    selectedOptionId,
    onToggle,
    onSelectOption,
}: SelectableItemCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)

    const config = ITEM_TYPE_CONFIG[item.item_type]
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] || LucideIcons.Package

    const formatPrice = (value: number | string) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(Number(value) || 0)

    const hasOptions = item.options.length > 0
    const basePrice = Number(item.base_price) || 0
    const selectedOption = item.options.find(o => o.id === selectedOptionId)
    const finalPrice = basePrice + (selectedOption ? Number(selectedOption.price_delta) || 0 : 0)

    return (
        <div className={`transition-all ${isSelected ? 'bg-white' : 'bg-slate-50 opacity-60'}`}>
            {/* Main Content */}
            <div className="p-4 flex items-start gap-3">
                {/* Checkbox/Radio */}
                {item.is_optional && (
                    <button
                        onClick={onToggle}
                        className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${isSelected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 hover:border-blue-400'
                            }`}
                    >
                        {isSelected && <Check className="h-4 w-4" />}
                    </button>
                )}

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-400'
                    }`}>
                    <IconComponent className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-medium text-slate-900 text-sm">{item.title}</h3>
                            {item.description && (
                                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                    {item.description}
                                </p>
                            )}
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className={`font-semibold ${isSelected ? 'text-green-600' : 'text-slate-400'}`}>
                                {formatPrice(finalPrice)}
                            </p>
                            {hasOptions && selectedOption && (
                                <p className="text-xs text-slate-500">
                                    {selectedOption.option_label}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Expand button for details/options */}
                    {(item.description || hasOptions) && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:underline"
                        >
                            {isExpanded ? 'Ver menos' : 'Ver detalhes'}
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 pt-0">
                    {/* Full Description */}
                    {item.description && (
                        <p className="text-sm text-slate-600 mb-3 ml-9">
                            {item.description}
                        </p>
                    )}

                    {/* Options */}
                    {hasOptions && (
                        <div className="ml-9 space-y-2">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Opções disponíveis
                            </p>
                            {item.options.map(option => {
                                const isOptionSelected = selectedOptionId === option.id
                                const delta = Number(option.price_delta) || 0
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => onSelectOption(option.id)}
                                        disabled={!isSelected}
                                        className={`w-full text-left p-3 rounded-lg border transition-all ${isOptionSelected
                                                ? 'border-blue-300 bg-blue-50 ring-1 ring-blue-200'
                                                : 'border-slate-200 hover:border-blue-200'
                                            } ${!isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isOptionSelected ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                                                    }`}>
                                                    {isOptionSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">
                                                    {option.option_label}
                                                </span>
                                            </div>
                                            <span className={`text-sm font-medium ${delta > 0 ? 'text-amber-600' : delta < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                                                {delta > 0 ? '+' : ''}{formatPrice(delta)}
                                            </span>
                                        </div>
                                        {option.description && (
                                            <p className="text-xs text-slate-500 mt-1 ml-6">
                                                {option.description}
                                            </p>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
