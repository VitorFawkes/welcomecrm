/**
 * SelectableItemCard - Premium card for optional items with toggle switch
 * 
 * Features:
 * - Modern toggle switch instead of checkbox
 * - Image thumbnail support
 * - Smooth animations
 * - Touch-friendly 48px+ targets
 * - ALL CONTENT VISIBLE INLINE (no "Ver mais")
 */

import type { ProposalItemWithOptions } from '@/types/proposals'
import { ITEM_TYPE_CONFIG } from '@/types/proposals'
import { Check, MapPin, Calendar, Clock, Users, Info } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

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

    // Rich content for additional details
    const richContent = item.rich_content as Record<string, any> || {}
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
        <div className={cn(
            "transition-all duration-200 overflow-hidden",
            isSelected ? "bg-white" : "bg-slate-50/80"
        )}>
            {/* Image Header - Full width when available */}
            {hasImage && (
                <div className={cn(
                    "relative aspect-[16/9] w-full overflow-hidden transition-all",
                    !isSelected && "opacity-60"
                )}>
                    <img
                        src={item.image_url!}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                    {/* Toggle on image */}
                    <button
                        onClick={onToggle}
                        className={cn(
                            "absolute top-3 right-3 w-14 h-8 rounded-full p-1 transition-all duration-200",
                            isSelected ? "bg-emerald-500" : "bg-slate-200/90 backdrop-blur-sm"
                        )}
                        style={{ touchAction: 'manipulation' }}
                        aria-label={isSelected ? 'Remover' : 'Adicionar'}
                    >
                        <div className={cn(
                            "w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-200",
                            isSelected ? "translate-x-6" : "translate-x-0"
                        )} />
                    </button>
                </div>
            )}

            {/* Main Content */}
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Image Thumbnail OR Icon (when no header image) */}
                    {!hasImage && (
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
                            isSelected ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400"
                        )}>
                            <IconComponent className="h-5 w-5" />
                        </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                {/* Title */}
                                <h3 className={cn(
                                    "font-semibold text-lg leading-tight transition-colors",
                                    isSelected ? "text-slate-900" : "text-slate-500"
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

                            {/* Right side: Price + Toggle (when no image) */}
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                {/* Price - Only show if > 0 */}
                                {finalPrice > 0 && (
                                    <div className="text-right">
                                        <p className={cn(
                                            "text-xl font-bold transition-colors",
                                            isSelected ? "text-emerald-600" : "text-slate-400"
                                        )}>
                                            {formatPrice(finalPrice)}
                                        </p>
                                        {richContent.price_per && (
                                            <p className="text-xs text-slate-400">{richContent.price_per}</p>
                                        )}
                                    </div>
                                )}

                                {/* Toggle Switch (when no image) */}
                                {!hasImage && (
                                    <button
                                        onClick={onToggle}
                                        className={cn(
                                            "w-14 h-8 rounded-full p-1 transition-all duration-200 flex-shrink-0",
                                            isSelected ? "bg-emerald-500" : "bg-slate-200"
                                        )}
                                        style={{ touchAction: 'manipulation' }}
                                        aria-label={isSelected ? 'Remover' : 'Adicionar'}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-200",
                                            isSelected ? "translate-x-6" : "translate-x-0"
                                        )} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Description - Always visible */}
                        {item.description && (
                            <p className={cn(
                                "text-sm mt-3 leading-relaxed transition-colors",
                                isSelected ? "text-slate-600" : "text-slate-400"
                            )}>
                                {item.description}
                            </p>
                        )}

                        {/* Rich Content Grid - Always visible */}
                        <div className="mt-4 grid grid-cols-2 gap-3">
                            {/* Duration */}
                            {richContent.duration && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        isSelected ? "bg-purple-50" : "bg-slate-100"
                                    )}>
                                        <Clock className={cn(
                                            "h-4 w-4 transition-colors",
                                            isSelected ? "text-purple-600" : "text-slate-400"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Duração</p>
                                        <p className={cn(
                                            "font-medium transition-colors",
                                            isSelected ? "text-slate-700" : "text-slate-500"
                                        )}>
                                            {richContent.duration}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Date */}
                            {richContent.date && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        isSelected ? "bg-indigo-50" : "bg-slate-100"
                                    )}>
                                        <Calendar className={cn(
                                            "h-4 w-4 transition-colors",
                                            isSelected ? "text-indigo-600" : "text-slate-400"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Data</p>
                                        <p className={cn(
                                            "font-medium transition-colors",
                                            isSelected ? "text-slate-700" : "text-slate-500"
                                        )}>
                                            {formatDate(richContent.date)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Included */}
                            {richContent.included && (
                                <div className="flex items-center gap-2 text-sm col-span-2">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        isSelected ? "bg-emerald-50" : "bg-slate-100"
                                    )}>
                                        <Check className={cn(
                                            "h-4 w-4 transition-colors",
                                            isSelected ? "text-emerald-600" : "text-slate-400"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Incluso</p>
                                        <p className={cn(
                                            "font-medium transition-colors",
                                            isSelected ? "text-slate-700" : "text-slate-500"
                                        )}>
                                            {richContent.included}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Participants */}
                            {richContent.participants && (
                                <div className="flex items-center gap-2 text-sm">
                                    <div className={cn(
                                        "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                        isSelected ? "bg-pink-50" : "bg-slate-100"
                                    )}>
                                        <Users className={cn(
                                            "h-4 w-4 transition-colors",
                                            isSelected ? "text-pink-600" : "text-slate-400"
                                        )} />
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-xs">Participantes</p>
                                        <p className={cn(
                                            "font-medium transition-colors",
                                            isSelected ? "text-slate-700" : "text-slate-500"
                                        )}>
                                            {richContent.participants}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Custom Fields - Dynamic rendering */}
                        {richContent.custom_fields && (richContent.custom_fields as { id: string; label: string; value: string; icon: string }[]).length > 0 && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {(richContent.custom_fields as { id: string; label: string; value: string; icon: string }[]).map((field) => {
                                    // Map icon string to component
                                    const iconMap: Record<string, React.ReactNode> = {
                                        'calendar': <Calendar className={cn("h-4 w-4 transition-colors", isSelected ? "text-indigo-600" : "text-slate-400")} />,
                                        'clock': <Clock className={cn("h-4 w-4 transition-colors", isSelected ? "text-purple-600" : "text-slate-400")} />,
                                        'bed': <LucideIcons.Bed className={cn("h-4 w-4 transition-colors", isSelected ? "text-emerald-600" : "text-slate-400")} />,
                                        'utensils': <LucideIcons.Utensils className={cn("h-4 w-4 transition-colors", isSelected ? "text-amber-600" : "text-slate-400")} />,
                                        'map-pin': <MapPin className={cn("h-4 w-4 transition-colors", isSelected ? "text-red-600" : "text-slate-400")} />,
                                        'plane': <LucideIcons.Plane className={cn("h-4 w-4 transition-colors", isSelected ? "text-sky-600" : "text-slate-400")} />,
                                        'car': <LucideIcons.Car className={cn("h-4 w-4 transition-colors", isSelected ? "text-amber-600" : "text-slate-400")} />,
                                        'users': <Users className={cn("h-4 w-4 transition-colors", isSelected ? "text-pink-600" : "text-slate-400")} />,
                                        'check': <Check className={cn("h-4 w-4 transition-colors", isSelected ? "text-emerald-600" : "text-slate-400")} />,
                                        'info': <Info className={cn("h-4 w-4 transition-colors", isSelected ? "text-slate-600" : "text-slate-400")} />,
                                    };
                                    const IconNode = iconMap[field.icon] || iconMap['info'];

                                    return (
                                        <div key={field.id} className="flex items-center gap-2 text-sm">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                isSelected ? "bg-slate-100" : "bg-slate-100"
                                            )}>
                                                {IconNode}
                                            </div>
                                            <div>
                                                <p className="text-slate-500 text-xs">{field.label}</p>
                                                <p className={cn(
                                                    "font-medium transition-colors",
                                                    isSelected ? "text-slate-700" : "text-slate-500"
                                                )}>
                                                    {field.value}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Legacy Rich Content Grid - Fallback for old data */}
                        {!richContent.custom_fields?.length && (richContent.duration || richContent.date || richContent.included || richContent.participants) && (
                            <div className="mt-4 grid grid-cols-2 gap-3">
                                {richContent.duration && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isSelected ? "bg-purple-50" : "bg-slate-100")}>
                                            <Clock className={cn("h-4 w-4 transition-colors", isSelected ? "text-purple-600" : "text-slate-400")} />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Duração</p>
                                            <p className={cn("font-medium transition-colors", isSelected ? "text-slate-700" : "text-slate-500")}>{richContent.duration}</p>
                                        </div>
                                    </div>
                                )}
                                {richContent.date && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isSelected ? "bg-indigo-50" : "bg-slate-100")}>
                                            <Calendar className={cn("h-4 w-4 transition-colors", isSelected ? "text-indigo-600" : "text-slate-400")} />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Data</p>
                                            <p className={cn("font-medium transition-colors", isSelected ? "text-slate-700" : "text-slate-500")}>{formatDate(richContent.date)}</p>
                                        </div>
                                    </div>
                                )}
                                {richContent.included && (
                                    <div className="flex items-center gap-2 text-sm col-span-2">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isSelected ? "bg-emerald-50" : "bg-slate-100")}>
                                            <Check className={cn("h-4 w-4 transition-colors", isSelected ? "text-emerald-600" : "text-slate-400")} />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Incluso</p>
                                            <p className={cn("font-medium transition-colors", isSelected ? "text-slate-700" : "text-slate-500")}>{richContent.included}</p>
                                        </div>
                                    </div>
                                )}
                                {richContent.participants && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition-colors", isSelected ? "bg-pink-50" : "bg-slate-100")}>
                                            <Users className={cn("h-4 w-4 transition-colors", isSelected ? "text-pink-600" : "text-slate-400")} />
                                        </div>
                                        <div>
                                            <p className="text-slate-500 text-xs">Participantes</p>
                                            <p className={cn("font-medium transition-colors", isSelected ? "text-slate-700" : "text-slate-500")}>{richContent.participants}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notes */}
                        {richContent.notes && (
                            <div className="mt-3 flex items-start gap-2 text-xs">
                                <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5" />
                                <span className={cn(
                                    "transition-colors",
                                    isSelected ? "text-slate-500" : "text-slate-400"
                                )}>
                                    {richContent.notes}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

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
