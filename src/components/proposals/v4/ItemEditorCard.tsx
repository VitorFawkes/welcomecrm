/**
 * ItemEditorCard - Complete item editor with all properties
 * 
 * Features:
 * - Inline title/description editing
 * - Price input
 * - Optional/default toggles
 * - Quantity adjustable toggle
 * - Options (variants) management
 * - Drag handle for reordering
 * - Delete/duplicate actions
 */

import { useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
    GripVertical,
    Trash2,
    Copy,
    ChevronDown,
    ChevronUp,
    Plus,
    X,
    ToggleLeft,
    ToggleRight,
    Settings2,
    Image as ImageIcon,
} from 'lucide-react'
import type { ProposalItemWithOptions, ProposalOption } from '@/types/proposals'
import { FlightTableEditor, type FlightSegment } from './FlightTableEditor'

interface ItemEditorCardProps {
    item: ProposalItemWithOptions
    onUpdate: (updates: Partial<ProposalItemWithOptions>) => void
    onRemove: () => void
    onDuplicate: () => void
    onAddOption: (label: string) => void
    onUpdateOption: (optionId: string, updates: Partial<ProposalOption>) => void
    onRemoveOption: (optionId: string) => void
}

export function ItemEditorCard({
    item,
    onUpdate,
    onRemove,
    onDuplicate,
    onAddOption,
    onUpdateOption,
    onRemoveOption,
}: ItemEditorCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [newOptionLabel, setNewOptionLabel] = useState('')

    // Sortable setup
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    }

    // Rich content helpers
    const richContent = (item.rich_content as Record<string, any>) || {}

    // Toggle handlers
    const handleToggleOptional = useCallback(() => {
        onUpdate({ is_optional: !item.is_optional })
    }, [item.is_optional, onUpdate])

    const handleToggleDefaultSelected = useCallback(() => {
        onUpdate({ is_default_selected: !item.is_default_selected })
    }, [item.is_default_selected, onUpdate])

    const handleToggleQuantityAdjustable = useCallback(() => {
        onUpdate({
            rich_content: {
                ...richContent,
                quantity_adjustable: !richContent.quantity_adjustable
            }
        })
    }, [richContent, onUpdate])

    // Add option handler
    const handleAddOption = useCallback(() => {
        if (newOptionLabel.trim()) {
            onAddOption(newOptionLabel.trim())
            setNewOptionLabel('')
        }
    }, [newOptionLabel, onAddOption])

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "bg-white rounded-lg border border-slate-200 shadow-sm",
                "transition-all duration-200",
                isDragging && "opacity-50 shadow-lg ring-2 ring-blue-500"
            )}
        >
            {/* Header Row */}
            <div className="flex items-start gap-3 p-4">
                {/* Drag Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="mt-1 cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-slate-100 transition-colors flex-shrink-0"
                >
                    <GripVertical className="h-4 w-4 text-slate-400" />
                </button>

                {/* Image Thumbnail */}
                {item.image_url ? (
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
                        <img
                            src={item.image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <ImageIcon className="h-5 w-5 text-slate-300" />
                    </div>
                )}

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                    {/* Title - editable */}
                    <input
                        type="text"
                        value={item.title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        className="w-full text-sm font-semibold text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder:text-slate-400"
                        placeholder="Título do item"
                    />

                    {/* Subtitle preview */}
                    {item.description && !isExpanded && (
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                            {item.description}
                        </p>
                    )}

                    {/* Quick badges */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        {item.is_optional && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                Opcional
                            </span>
                        )}
                        {richContent.quantity_adjustable && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">
                                Qtd. ajustável
                            </span>
                        )}
                        {item.options.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                {item.options.length} opções
                            </span>
                        )}
                    </div>
                </div>

                {/* Price with Currency Selector */}
                <div className="flex-shrink-0">
                    <div className="flex items-center gap-1 border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50">
                        <select
                            value={richContent.currency || 'BRL'}
                            onChange={(e) => onUpdate({
                                rich_content: { ...richContent, currency: e.target.value }
                            })}
                            className="text-xs font-medium text-slate-600 bg-transparent border-none outline-none cursor-pointer"
                        >
                            <option value="BRL">R$</option>
                            <option value="USD">US$</option>
                            <option value="EUR">€</option>
                        </select>
                        <input
                            type="number"
                            value={item.base_price || ''}
                            onChange={(e) => onUpdate({ base_price: parseFloat(e.target.value) || 0 })}
                            className="w-20 text-sm font-semibold text-slate-900 text-right bg-transparent border-none outline-none focus:ring-0 p-0"
                            placeholder="0,00"
                            step="0.01"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="h-8 w-8"
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                        ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                        )}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onDuplicate}
                        className="h-8 w-8"
                    >
                        <Copy className="h-4 w-4 text-slate-400" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-4 space-y-4">
                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-slate-500 block mb-1">
                            Descrição
                        </label>
                        <Textarea
                            value={item.description || ''}
                            onChange={(e) => onUpdate({ description: e.target.value })}
                            placeholder="Descrição detalhada do item..."
                            className="min-h-[80px]"
                        />
                    </div>

                    {/* Toggles Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Optional Toggle */}
                        <button
                            onClick={handleToggleOptional}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                item.is_optional
                                    ? "border-amber-200 bg-amber-50"
                                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                            )}
                        >
                            {item.is_optional ? (
                                <ToggleRight className="h-5 w-5 text-amber-600" />
                            ) : (
                                <ToggleLeft className="h-5 w-5 text-slate-400" />
                            )}
                            <div className="text-left">
                                <p className="text-xs font-medium text-slate-700">Opcional</p>
                                <p className="text-xs text-slate-500">Cliente escolhe incluir</p>
                            </div>
                        </button>

                        {/* Default Selected Toggle */}
                        <button
                            onClick={handleToggleDefaultSelected}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                item.is_default_selected
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                            )}
                        >
                            {item.is_default_selected ? (
                                <ToggleRight className="h-5 w-5 text-emerald-600" />
                            ) : (
                                <ToggleLeft className="h-5 w-5 text-slate-400" />
                            )}
                            <div className="text-left">
                                <p className="text-xs font-medium text-slate-700">Pré-selecionado</p>
                                <p className="text-xs text-slate-500">Marcado por padrão</p>
                            </div>
                        </button>

                        {/* Quantity Adjustable Toggle */}
                        <button
                            onClick={handleToggleQuantityAdjustable}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-lg border transition-all",
                                richContent.quantity_adjustable
                                    ? "border-purple-200 bg-purple-50"
                                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                            )}
                        >
                            {richContent.quantity_adjustable ? (
                                <ToggleRight className="h-5 w-5 text-purple-600" />
                            ) : (
                                <ToggleLeft className="h-5 w-5 text-slate-400" />
                            )}
                            <div className="text-left">
                                <p className="text-xs font-medium text-slate-700">Qtd. Ajustável</p>
                                <p className="text-xs text-slate-500">Cliente pode alterar</p>
                            </div>
                        </button>
                    </div>

                    {/* Flight Segments Editor (only for flights) */}
                    {item.item_type === 'flight' && (
                        <FlightTableEditor
                            segments={(richContent.segments as FlightSegment[]) || []}
                            onChange={(segments: FlightSegment[]) => onUpdate({
                                rich_content: { ...richContent, segments } as any
                            })}
                        />
                    )}

                    {/* Custom Fields Section */}
                    <div className="border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Plus className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-medium text-slate-700">Dados do Item</span>
                            </div>
                        </div>

                        {/* Quick Add Suggestions based on item_type */}
                        {!richContent.custom_fields?.length && (
                            <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                <p className="text-xs text-slate-500 mb-2">Sugestões para {item.item_type}:</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {item.item_type === 'hotel' && (
                                        <>
                                            {['Check-in', 'Check-out', 'Regime', 'Categoria'].map(label => (
                                                <button
                                                    key={label}
                                                    onClick={() => onUpdate({
                                                        rich_content: {
                                                            ...richContent,
                                                            custom_fields: [
                                                                ...(richContent.custom_fields || []),
                                                                { id: `cf-${Date.now()}`, label, value: '', icon: label === 'Check-in' || label === 'Check-out' ? 'calendar' : label === 'Regime' ? 'utensils' : 'bed' }
                                                            ]
                                                        }
                                                    })}
                                                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md hover:border-emerald-400 hover:text-emerald-700 transition-colors"
                                                >
                                                    + {label}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {item.item_type === 'flight' && (
                                        <>
                                            {['Origem', 'Destino', 'Cia Aérea', 'Classe', 'Bagagem'].map(label => (
                                                <button
                                                    key={label}
                                                    onClick={() => onUpdate({
                                                        rich_content: {
                                                            ...richContent,
                                                            custom_fields: [
                                                                ...(richContent.custom_fields || []),
                                                                { id: `cf-${Date.now()}`, label, value: '', icon: 'plane' }
                                                            ]
                                                        }
                                                    })}
                                                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md hover:border-sky-400 hover:text-sky-700 transition-colors"
                                                >
                                                    + {label}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {item.item_type === 'transfer' && (
                                        <>
                                            {['Origem', 'Destino', 'Veículo', 'Horário'].map(label => (
                                                <button
                                                    key={label}
                                                    onClick={() => onUpdate({
                                                        rich_content: {
                                                            ...richContent,
                                                            custom_fields: [
                                                                ...(richContent.custom_fields || []),
                                                                { id: `cf-${Date.now()}`, label, value: '', icon: 'car' }
                                                            ]
                                                        }
                                                    })}
                                                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md hover:border-amber-400 hover:text-amber-700 transition-colors"
                                                >
                                                    + {label}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {item.item_type === 'experience' && (
                                        <>
                                            {['Data', 'Duração', 'Inclusos', 'Participantes'].map(label => (
                                                <button
                                                    key={label}
                                                    onClick={() => onUpdate({
                                                        rich_content: {
                                                            ...richContent,
                                                            custom_fields: [
                                                                ...(richContent.custom_fields || []),
                                                                { id: `cf-${Date.now()}`, label, value: '', icon: label === 'Data' ? 'calendar' : label === 'Duração' ? 'clock' : 'sparkles' }
                                                            ]
                                                        }
                                                    })}
                                                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-md hover:border-purple-400 hover:text-purple-700 transition-colors"
                                                >
                                                    + {label}
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {/* Generic add for any type */}
                                    <button
                                        onClick={() => onUpdate({
                                            rich_content: {
                                                ...richContent,
                                                custom_fields: [
                                                    ...(richContent.custom_fields || []),
                                                    { id: `cf-${Date.now()}`, label: '', value: '', icon: 'info' }
                                                ]
                                            }
                                        })}
                                        className="px-2 py-1 text-xs bg-emerald-50 border border-emerald-200 rounded-md text-emerald-700 hover:bg-emerald-100 transition-colors"
                                    >
                                        + Campo Personalizado
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Existing Custom Fields */}
                        {richContent.custom_fields?.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {(richContent.custom_fields as { id: string; label: string; value: string; icon: string }[]).map((field, idx) => (
                                    <div key={field.id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                                        {/* Icon Selector */}
                                        <select
                                            value={field.icon || 'info'}
                                            onChange={(e) => {
                                                const newFields = [...(richContent.custom_fields || [])];
                                                newFields[idx] = { ...field, icon: e.target.value };
                                                onUpdate({ rich_content: { ...richContent, custom_fields: newFields } });
                                            }}
                                            className="w-20 text-xs bg-white border border-slate-200 rounded px-1.5 py-1"
                                        >
                                            <option value="calendar">📅 Data</option>
                                            <option value="clock">⏰ Hora</option>
                                            <option value="bed">🛏️ Quarto</option>
                                            <option value="utensils">🍴 Regime</option>
                                            <option value="map-pin">📍 Local</option>
                                            <option value="plane">✈️ Voo</option>
                                            <option value="car">🚗 Veículo</option>
                                            <option value="users">👥 Pessoas</option>
                                            <option value="check">✅ Incluso</option>
                                            <option value="info">ℹ️ Info</option>
                                        </select>
                                        {/* Label */}
                                        <input
                                            type="text"
                                            value={field.label}
                                            onChange={(e) => {
                                                const newFields = [...(richContent.custom_fields || [])];
                                                newFields[idx] = { ...field, label: e.target.value };
                                                onUpdate({ rich_content: { ...richContent, custom_fields: newFields } });
                                            }}
                                            className="w-24 text-xs font-medium bg-transparent border-none outline-none p-0 placeholder:text-slate-400"
                                            placeholder="Label"
                                        />
                                        {/* Value */}
                                        <input
                                            type="text"
                                            value={field.value}
                                            onChange={(e) => {
                                                const newFields = [...(richContent.custom_fields || [])];
                                                newFields[idx] = { ...field, value: e.target.value };
                                                onUpdate({ rich_content: { ...richContent, custom_fields: newFields } });
                                            }}
                                            className="flex-1 text-sm bg-transparent border-none outline-none p-0 placeholder:text-slate-400"
                                            placeholder="Valor"
                                        />
                                        {/* Remove */}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                const newFields = (richContent.custom_fields || []).filter((_: any, i: number) => i !== idx);
                                                onUpdate({ rich_content: { ...richContent, custom_fields: newFields } });
                                            }}
                                            className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                                {/* Add more button */}
                                <button
                                    onClick={() => onUpdate({
                                        rich_content: {
                                            ...richContent,
                                            custom_fields: [
                                                ...(richContent.custom_fields || []),
                                                { id: `cf-${Date.now()}`, label: '', value: '', icon: 'info' }
                                            ]
                                        }
                                    })}
                                    className="w-full py-2 text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg hover:border-emerald-400 hover:text-emerald-600 transition-colors"
                                >
                                    + Adicionar Campo
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Options Section */}
                    <div className="border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-slate-400" />
                                <span className="text-xs font-medium text-slate-700">Opções (Variantes de Preço)</span>
                            </div>
                        </div>

                        {/* Existing Options */}
                        {item.options.length > 0 && (
                            <div className="space-y-2 mb-3">
                                {item.options.map((option) => (
                                    <div
                                        key={option.id}
                                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                                    >
                                        <input
                                            type="text"
                                            value={option.option_label}
                                            onChange={(e) => onUpdateOption(option.id, { option_label: e.target.value })}
                                            className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 p-0"
                                            placeholder="Nome da opção"
                                        />
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs text-slate-400">+R$</span>
                                            <input
                                                type="number"
                                                value={option.price_delta || ''}
                                                onChange={(e) => onUpdateOption(option.id, { price_delta: parseFloat(e.target.value) || 0 })}
                                                className="w-20 text-sm text-right bg-transparent border-none outline-none focus:ring-0 p-0"
                                                placeholder="0"
                                            />
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => onRemoveOption(option.id)}
                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Add New Option */}
                        <div className="flex items-center gap-2">
                            <Input
                                value={newOptionLabel}
                                onChange={(e) => setNewOptionLabel(e.target.value)}
                                placeholder="Nova opção (ex: Café da manhã incluso)"
                                className="flex-1 h-9 text-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleAddOption}
                                disabled={!newOptionLabel.trim()}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ItemEditorCard
