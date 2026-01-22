/**
 * RadioItemCard - Premium item card with radio button selection
 * 
 * Features:
 * - Image thumbnail (when available)
 * - Premium typography with clear hierarchy
 * - Larger touch targets (48px minimum)
 * - Smooth animations
 * - Quantity adjustment for hotels
 * - ALL CONTENT VISIBLE INLINE (no "Ver mais")
 */

import type { ProposalItemWithOptions } from '@/types/proposals'
import { ITEM_TYPE_CONFIG } from '@/types/proposals'
import { Minus, Plus, Check, MapPin, Calendar, Users, Utensils, Clock, Info } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

interface RadioItemCardProps {
    item: ProposalItemWithOptions
    isSelected: boolean
    selectedOptionId?: string
    onSelect: () => void
    onSelectOption: (optionId: string) => void
    quantity?: number
    onChangeQuantity?: (quantity: number) => void
}

export function RadioItemCard({
    item,
    isSelected,
    selectedOptionId,
    onSelect,
    onSelectOption,
    quantity = 1,
    onChangeQuantity,
}: RadioItemCardProps) {
    const config = ITEM_TYPE_CONFIG[item.item_type]
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] || LucideIcons.Package

    const formatPrice = (value: number | string, currency = 'BRL') =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency,
        }).format(Number(value) || 0)

    const hasOptions = item.options.length > 0
    const basePrice = Number(item.base_price) || 0
    const selectedOption = item.options.find(o => o.id === selectedOptionId)
    const unitPrice = basePrice + (selectedOption ? Number(selectedOption.price_delta) || 0 : 0)
    const finalPrice = unitPrice * quantity

    // Rich content for additional details
    const richContent = item.rich_content as Record<string, any> || {}
    const quantityUnit = richContent.quantity_unit || 'un'
    const showQuantity = onChangeQuantity && (item.item_type === 'hotel' || richContent.quantity_adjustable)

    // Has image to display
    const hasImage = !!item.image_url

    // Format dates helper
    const formatDate = (dateStr?: string) => {
        if (!dateStr) return null
        try {
            return new Date(dateStr).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            })
        } catch { return dateStr }
    }

    return (
        <div
            className={cn(
                "transition-all duration-200 overflow-hidden",
                isSelected
                    ? "bg-blue-50/50"
                    : "bg-white hover:bg-slate-50"
            )}
        >
            {/* Main Card - Clickable area */}
            <button
                onClick={onSelect}
                className="w-full text-left"
                style={{ touchAction: 'manipulation' }}
            >
                {/* Image Header - Full width when available */}
                {hasImage && (
                    <div className="relative aspect-[16/9] w-full overflow-hidden">
                        <img
                            src={item.image_url!}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        {/* Selection indicator */}
                        <div className={cn(
                            "absolute top-3 right-3 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected
                                ? "border-blue-600 bg-blue-600"
                                : "border-white bg-white/80 backdrop-blur-sm"
                        )}>
                            {isSelected && <Check className="h-4 w-4 text-white" />}
                        </div>
                    </div>
                )}

                {/* Content Section */}
                <div className="p-4">
                    {/* Header with radio (when no image) */}
                    <div className="flex items-start gap-3">
                        {/* Radio Button - Only show when no image */}
                        {!hasImage && (
                            <div className={cn(
                                "mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0",
                                isSelected
                                    ? "border-blue-600 bg-blue-600"
                                    : "border-slate-300 bg-white"
                            )}>
                                {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                            </div>
                        )}

                        {/* Icon (when no image) */}
                        {!hasImage && (
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                                isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                            )}>
                                <IconComponent className="h-5 w-5" />
                            </div>
                        )}

                        {/* Title & Price */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                    <h3 className={cn(
                                        "font-semibold text-lg leading-tight",
                                        isSelected ? "text-slate-900" : "text-slate-700"
                                    )}>
                                        {item.title}
                                    </h3>

                                    {/* Subtitle / Location */}
                                    {(richContent.subtitle || richContent.location_city) && (
                                        <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
                                            <MapPin className="h-3.5 w-3.5" />
                                            {richContent.subtitle || richContent.location_city}
                                        </p>
                                    )}
                                </div>

                                {/* Price */}
                                <div className="text-right flex-shrink-0">
                                    <p className={cn(
                                        "text-xl font-bold",
                                        isSelected ? "text-emerald-600" : "text-slate-600"
                                    )}>
                                        {formatPrice(finalPrice)}
                                    </p>
                                    {quantity > 1 && (
                                        <p className="text-xs text-slate-500">
                                            {formatPrice(unitPrice)}/{quantityUnit}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Description - Always visible */}
                    {item.description && (
                        <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                            {item.description}
                        </p>
                    )}

                    {/* Rich Content Grid - Always visible */}
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        {/* Room Type */}
                        {richContent.room_type && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <LucideIcons.BedDouble className="h-4 w-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Quarto</p>
                                    <p className="font-medium text-slate-700">{richContent.room_type}</p>
                                </div>
                            </div>
                        )}

                        {/* Board Type */}
                        {richContent.board_type && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <Utensils className="h-4 w-4 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Regime</p>
                                    <p className="font-medium text-slate-700">{richContent.board_type}</p>
                                </div>
                            </div>
                        )}

                        {/* Check-in/Check-out dates */}
                        {richContent.check_in_date && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Check-in</p>
                                    <p className="font-medium text-slate-700">
                                        {formatDate(richContent.check_in_date)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {richContent.check_out_date && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <Calendar className="h-4 w-4 text-amber-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Check-out</p>
                                    <p className="font-medium text-slate-700">
                                        {formatDate(richContent.check_out_date)}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Duration */}
                        {richContent.duration && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                                    <Clock className="h-4 w-4 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Duração</p>
                                    <p className="font-medium text-slate-700">{richContent.duration}</p>
                                </div>
                            </div>
                        )}

                        {/* Cabin Class */}
                        {richContent.cabin_class && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
                                    <LucideIcons.Plane className="h-4 w-4 text-sky-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Classe</p>
                                    <p className="font-medium text-slate-700">{richContent.cabin_class}</p>
                                </div>
                            </div>
                        )}

                        {/* Travelers */}
                        {richContent.guests && (
                            <div className="flex items-center gap-2 text-sm">
                                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                                    <Users className="h-4 w-4 text-pink-600" />
                                </div>
                                <div>
                                    <p className="text-slate-500 text-xs">Hóspedes</p>
                                    <p className="font-medium text-slate-700">{richContent.guests}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Badges Row */}
                    {richContent.cancellation_policy && (
                        <div className="mt-3 flex items-center gap-2 text-xs">
                            <Info className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-slate-500">{richContent.cancellation_policy}</span>
                        </div>
                    )}
                </div>
            </button>

            {/* Quantity Adjuster - Below card when selected */}
            {isSelected && showQuantity && (
                <div className="px-4 pb-4">
                    <div className="flex items-center gap-3 p-2 bg-slate-100 rounded-lg w-fit">
                        <span className="text-sm text-slate-600 capitalize">{quantityUnit}:</span>
                        <button
                            onClick={() => onChangeQuantity?.(Math.max(1, quantity - 1))}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:bg-slate-50 transition-colors"
                            style={{ touchAction: 'manipulation' }}
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center text-lg font-semibold text-slate-900">
                            {quantity}
                        </span>
                        <button
                            onClick={() => onChangeQuantity?.(quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-600 hover:bg-slate-50 transition-colors"
                            style={{ touchAction: 'manipulation' }}
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Options - Always visible when available */}
            {hasOptions && (
                <div className="px-4 pb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Opções disponíveis
                    </p>
                    <div className="space-y-2">
                        {item.options.map(option => {
                            const isOptionSelected = selectedOptionId === option.id
                            const delta = Number(option.price_delta) || 0
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => onSelectOption(option.id)}
                                    disabled={!isSelected}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl border-2 transition-all",
                                        isOptionSelected
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-slate-200 hover:border-blue-300",
                                        !isSelected && "opacity-50 cursor-not-allowed"
                                    )}
                                    style={{ touchAction: 'manipulation' }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                                                isOptionSelected
                                                    ? "border-blue-600 bg-blue-600"
                                                    : "border-slate-300"
                                            )}>
                                                {isOptionSelected && (
                                                    <div className="w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </div>
                                            <span className="text-sm font-medium text-slate-900">
                                                {option.option_label}
                                            </span>
                                        </div>
                                        <span className={cn(
                                            "text-sm font-semibold",
                                            delta > 0 ? "text-amber-600" : delta < 0 ? "text-emerald-600" : "text-slate-500"
                                        )}>
                                            {delta > 0 ? '+' : ''}{formatPrice(delta)}
                                        </span>
                                    </div>
                                    {option.description && (
                                        <p className="text-xs text-slate-500 mt-1 ml-8">
                                            {option.description}
                                        </p>
                                    )}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
