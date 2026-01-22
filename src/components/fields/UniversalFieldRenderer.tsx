import React from 'react'
import {
    MapPin, Calendar, DollarSign, Tag, X, Check, Edit2, AlertCircle,
    Eraser, Type, Hash, CalendarDays, List, CheckSquare, Banknote
} from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'

type SystemField = Database['public']['Tables']['system_fields']['Row']

interface UniversalFieldRendererProps {
    field: Partial<SystemField>
    value: any
    onChange?: (value: any) => void
    mode?: 'display' | 'edit'
    status?: 'ok' | 'blocking' | 'attention'
    sdrValue?: any
    onEdit?: () => void
    correctionMode?: boolean
    isPlanner?: boolean // To show SDR section
}

// --- HELPER FUNCTIONS ---
const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    // Handle simple date strings YYYY-MM-DD to avoid timezone issues
    const [year, month, day] = dateStr.split('-').map(Number)
    if (!year || !month || !day) return dateStr
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const formatBudget = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

// --- SUB-COMPONENTS ---

const FieldCard = ({
    icon: Icon,
    iconColor,
    label,
    value,
    subValue,
    status = 'ok',
    sdrValue,
    onEdit,
    correctionMode,
    showSdrSection
}: any) => {
    return (
        <div
            className={cn(
                "group relative p-4 rounded-xl border transition-all duration-200",
                correctionMode
                    ? "bg-[#fdfbf7] border-amber-200/50 border-dashed hover:border-amber-300 hover:bg-[#fffdf9] cursor-pointer"
                    : cn(
                        "bg-white",
                        status === 'blocking' ? "border-red-300 bg-red-50/30" :
                            status === 'attention' ? "border-orange-300 bg-orange-50/30" :
                                "border-gray-300",
                        "hover:shadow-md cursor-pointer",
                        status === 'blocking' && "hover:border-red-400",
                        status === 'attention' && "hover:border-orange-400",
                        status === 'ok' && "hover:border-indigo-400"
                    )
            )}
            onClick={onEdit}
        >
            <div className={cn(
                "absolute top-3 right-3 transition-opacity",
                correctionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                {correctionMode ? (
                    <div className="flex items-center gap-1 text-amber-600 bg-amber-100 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        <Eraser className="h-3 w-3" /> Corrigir
                    </div>
                ) : (
                    <Edit2 className="h-4 w-4 text-indigo-500" />
                )}
            </div>

            {status !== 'ok' && !correctionMode && (
                <div className={cn(
                    "absolute -top-2 -right-2 p-1 rounded-full shadow-sm border",
                    status === 'blocking' ? "bg-red-100 border-red-200 text-red-600" : "bg-orange-100 border-orange-200 text-orange-600"
                )}>
                    <AlertCircle className="h-3 w-3" />
                </div>
            )}

            <div className="flex items-start gap-3">
                <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    correctionMode ? "bg-gray-100 text-gray-400 grayscale" : iconColor
                )}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className={cn(
                        "text-xs font-medium uppercase tracking-wide mb-1 flex items-center gap-2",
                        correctionMode ? "text-gray-400 font-mono" : "text-gray-500"
                    )}>
                        {label}
                        {status === 'blocking' && <span className="text-[10px] text-red-600 font-bold font-sans">Obrigatório</span>}
                    </p>

                    {/* Main Value */}
                    <div className={cn(
                        "text-sm truncate",
                        correctionMode ? "font-mono text-gray-700 font-medium" : "font-semibold text-gray-900"
                    )}>
                        {(() => {
                            if (value === null || value === undefined || value === '') {
                                return status === 'blocking' ?
                                    <span className="text-red-500 italic font-medium font-sans">Obrigatório</span> :
                                    <span className="text-gray-400 italic font-normal font-sans">Não informado</span>
                            }
                            if (typeof value === 'object' && !React.isValidElement(value)) {
                                return JSON.stringify(value)
                            }
                            return value
                        })()}
                    </div>
                    {subValue && <p className="text-xs text-gray-500 mt-0.5">{subValue}</p>}

                    {/* SDR Reference Section */}
                    {showSdrSection && (
                        <div className="mt-3 pt-2 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 mb-1">
                                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider">
                                    SDR
                                </span>
                            </div>
                            <div className="text-xs text-gray-600 bg-gray-50/50 p-2 rounded-md border border-gray-100">
                                {sdrValue || <span className="text-gray-400 italic">Não informado pelo SDR</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function UniversalFieldRenderer({
    field,
    value,
    onChange,
    mode = 'display',
    status = 'ok',
    sdrValue,
    onEdit,
    correctionMode = false,
    isPlanner = false
}: UniversalFieldRendererProps) {

    // Parse options
    let options: any[] = []
    try {
        if (typeof field.options === 'string') {
            options = JSON.parse(field.options)
        } else if (Array.isArray(field.options)) {
            options = field.options
        }
    } catch (e) {
        console.error("Error parsing options for field", field.key, e)
        options = []
    }

    // --- EDIT MODE ---
    if (mode === 'edit') {
        // Special case: destinos field uses comma-separated text input
        if (field.key === 'destinos') {
            const destinos = Array.isArray(value) ? value : []
            const textValue = destinos.join(', ')

            return (
                <div className="space-y-3">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            defaultValue={textValue}
                            onBlur={(e) => {
                                const newDestinos = e.target.value
                                    .split(',')
                                    .map((s: string) => s.trim())
                                    .filter((s: string) => s.length > 0)
                                onChange?.(newDestinos)
                            }}
                            placeholder="Ex: Paris, Londres, Roma"
                            className="block w-full pl-10 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50/50 focus:bg-white transition-colors"
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        Separe os destinos por vírgula para identificá-los individualmente.
                    </p>
                </div>
            )
        }

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        value={value || ''}
                        onChange={(e) => onChange?.(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-gray-50/50 focus:bg-white min-h-[120px]"
                        placeholder={field.label || ''}
                    />
                )
            case 'select':
                return (
                    <select
                        value={value || ''}
                        onChange={(e) => onChange?.(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                        <option value="">Selecione...</option>
                        {options.map((opt: any, idx: number) => {
                            const optValue = typeof opt === 'object' ? opt.value : opt
                            const optLabel = typeof opt === 'object' ? opt.label : opt
                            return <option key={idx} value={optValue}>{optLabel}</option>
                        })}
                    </select>
                )
            case 'multiselect': {
                // Support for value structure with explanations: { selected: [...], explanations: {...} }
                // Backward compatible with old structure: [...]
                const hasExplanations = options.some((opt: any) => opt.requiresExplanation)

                let selectedValues: string[] = []
                let explanations: Record<string, string> = {}

                if (hasExplanations && typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    selectedValues = Array.isArray(value.selected) ? value.selected : []
                    explanations = value.explanations || {}
                } else {
                    selectedValues = Array.isArray(value) ? value : (value ? [value] : [])
                }

                const updateValue = (newSelected: string[], newExplanations: Record<string, string>) => {
                    if (hasExplanations) {
                        onChange?.({ selected: newSelected, explanations: newExplanations })
                    } else {
                        onChange?.(newSelected)
                    }
                }

                return (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Selecione as opções:</label>

                        {/* Premium Chip Grid - No internal scroll */}
                        <div className="flex flex-wrap gap-2">
                            {options.map((opt: any, idx: number) => {
                                const optValue = typeof opt === 'object' ? opt.value : opt
                                const optLabel = typeof opt === 'object' ? opt.label : opt
                                const optColor = typeof opt === 'object' ? opt.color : 'gray'
                                const requiresExplanation = typeof opt === 'object' ? opt.requiresExplanation : false
                                const isSelected = selectedValues.includes(optValue)

                                // Color mapping for chips
                                const colorClasses: Record<string, { bg: string, text: string, selectedBg: string, selectedText: string }> = {
                                    gray: { bg: 'bg-gray-100', text: 'text-gray-700', selectedBg: 'bg-gray-600', selectedText: 'text-white' },
                                    blue: { bg: 'bg-blue-50', text: 'text-blue-700', selectedBg: 'bg-blue-600', selectedText: 'text-white' },
                                    green: { bg: 'bg-green-50', text: 'text-green-700', selectedBg: 'bg-green-600', selectedText: 'text-white' },
                                    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', selectedBg: 'bg-yellow-500', selectedText: 'text-white' },
                                    red: { bg: 'bg-red-50', text: 'text-red-700', selectedBg: 'bg-red-600', selectedText: 'text-white' },
                                    purple: { bg: 'bg-purple-50', text: 'text-purple-700', selectedBg: 'bg-purple-600', selectedText: 'text-white' },
                                    pink: { bg: 'bg-pink-50', text: 'text-pink-700', selectedBg: 'bg-pink-600', selectedText: 'text-white' },
                                }
                                const colors = colorClasses[optColor] || colorClasses.gray

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            let newSelected: string[]
                                            let newExplanations = { ...explanations }

                                            if (isSelected) {
                                                newSelected = selectedValues.filter((v: string) => v !== optValue)
                                                delete newExplanations[optValue]
                                            } else {
                                                newSelected = [...selectedValues, optValue]
                                            }
                                            updateValue(newSelected, newExplanations)
                                        }}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                                            "border-2 hover:scale-105 active:scale-95",
                                            isSelected
                                                ? `${colors.selectedBg} ${colors.selectedText} border-transparent shadow-sm`
                                                : `${colors.bg} ${colors.text} border-transparent hover:border-gray-300`
                                        )}
                                    >
                                        {isSelected && <Check className="h-3.5 w-3.5" />}
                                        {optLabel}
                                        {requiresExplanation && !isSelected && (
                                            <span className="text-[10px] opacity-60">💬</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {/* Explanation Textareas for selected items that require it */}
                        {selectedValues.some(val =>
                            options.find((opt: any) => (typeof opt === 'object' ? opt.value : opt) === val)?.requiresExplanation
                        ) && (
                                <div className="space-y-3 pt-2 border-t border-gray-200">
                                    <p className="text-xs font-medium text-amber-700 flex items-center gap-1">
                                        💬 Justifique suas seleções:
                                    </p>
                                    {selectedValues.map((val: string) => {
                                        const opt = options.find((o: any) => (typeof o === 'object' ? o.value : o) === val)
                                        if (!opt?.requiresExplanation) return null

                                        const optLabel = typeof opt === 'object' ? opt.label : opt

                                        return (
                                            <div key={val} className="animate-in slide-in-from-top-2 duration-200">
                                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                                    {optLabel}
                                                </label>
                                                <textarea
                                                    value={explanations[val] || ''}
                                                    onChange={(e) => {
                                                        const newExplanations = { ...explanations, [val]: e.target.value }
                                                        updateValue(selectedValues, newExplanations)
                                                    }}
                                                    placeholder={`Por que "${optLabel}"?`}
                                                    className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/50 resize-none min-h-[70px] transition-shadow"
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                    </div>
                )
            }
            case 'checklist': {
                // Support for new value structure: { selected: [...], explanations: {...} }
                // Backward compatible with old structure: [...]
                const hasExplanations = options.some((opt: any) => opt.requiresExplanation)

                let checkedValues: string[] = []
                let explanations: Record<string, string> = {}

                if (hasExplanations && typeof value === 'object' && value !== null && !Array.isArray(value)) {
                    checkedValues = Array.isArray(value.selected) ? value.selected : []
                    explanations = value.explanations || {}
                } else {
                    checkedValues = Array.isArray(value) ? value : (value ? [value] : [])
                }

                const updateValue = (newSelected: string[], newExplanations: Record<string, string>) => {
                    if (hasExplanations) {
                        onChange?.({ selected: newSelected, explanations: newExplanations })
                    } else {
                        onChange?.(newSelected)
                    }
                }

                return (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">Marque os itens aplicáveis:</label>
                        <div className="space-y-2 bg-gray-50/50 p-3 rounded-lg border border-gray-200">
                            {options.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">Nenhuma opção configurada.</p>
                            ) : (
                                options.map((opt: any, idx: number) => {
                                    const optValue = typeof opt === 'object' ? opt.value : opt
                                    const optLabel = typeof opt === 'object' ? opt.label : opt
                                    const requiresExplanation = typeof opt === 'object' ? opt.requiresExplanation : false
                                    const isChecked = checkedValues.includes(optValue)

                                    return (
                                        <div key={idx} className="space-y-2">
                                            <label
                                                className={cn(
                                                    "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors",
                                                    isChecked ? "bg-green-50 border border-green-200" : "bg-white border border-gray-100 hover:bg-gray-50"
                                                )}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        let newSelected: string[]
                                                        let newExplanations = { ...explanations }

                                                        if (isChecked) {
                                                            newSelected = checkedValues.filter((v: string) => v !== optValue)
                                                            delete newExplanations[optValue]
                                                        } else {
                                                            newSelected = [...checkedValues, optValue]
                                                        }
                                                        updateValue(newSelected, newExplanations)
                                                    }}
                                                    className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                                />
                                                <span className={cn(
                                                    "text-sm font-medium flex-1",
                                                    isChecked ? "text-green-800" : "text-gray-700"
                                                )}>
                                                    {optLabel}
                                                </span>
                                                {requiresExplanation && (
                                                    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                                        Porquê?
                                                    </span>
                                                )}
                                            </label>

                                            {/* Explanation textarea for options that require it */}
                                            {isChecked && requiresExplanation && (
                                                <div className="ml-7 animate-in slide-in-from-top-2 duration-200">
                                                    <textarea
                                                        value={explanations[optValue] || ''}
                                                        onChange={(e) => {
                                                            const newExplanations = { ...explanations, [optValue]: e.target.value }
                                                            updateValue(checkedValues, newExplanations)
                                                        }}
                                                        placeholder="Explique o motivo..."
                                                        className="w-full px-3 py-2 text-sm border border-amber-200 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-amber-50/50 resize-none min-h-[80px]"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )
            }
            case 'boolean':
                return (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => onChange?.(e.target.checked)}
                            className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{field.label}</span>
                    </div>
                )
            case 'date':
                return (
                    <input
                        type="date"
                        value={value || ''}
                        onChange={(e) => onChange?.(e.target.value)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                    />
                )
            case 'datetime':
                // Handle various datetime string formats from integrations
                // Convert "YYYY-MM-DD HH:MM:SS" to "YYYY-MM-DDTHH:MM" for input
                const normalizedDatetime = (() => {
                    if (!value) return ''
                    // Already in ISO format with T
                    if (value.includes('T')) return value.slice(0, 16)
                    // Format: "YYYY-MM-DD HH:MM:SS" (from AC)
                    if (value.includes(' ')) return value.replace(' ', 'T').slice(0, 16)
                    return value
                })()
                return (
                    <input
                        type="datetime-local"
                        value={normalizedDatetime}
                        onChange={(e) => onChange?.(e.target.value)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                    />
                )
            case 'date_range': {
                const rangeValue = typeof value === 'object' ? value : { start: '', end: '' }
                // Check if field options has includeTime flag
                const fieldOpts = typeof field.options === 'object' && !Array.isArray(field.options) ? field.options : {}
                const includeTime = (fieldOpts as any)?.includeTime || false
                const inputType = includeTime ? 'datetime-local' : 'date'

                return (
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">{includeTime ? 'Data/Hora Início' : 'Início'}</label>
                            <input
                                type={inputType}
                                value={rangeValue?.start || ''}
                                onChange={(e) => onChange?.({ ...rangeValue, start: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-xs text-gray-500 mb-1 block">{includeTime ? 'Data/Hora Fim' : 'Fim'}</label>
                            <input
                                type={inputType}
                                value={rangeValue?.end || ''}
                                onChange={(e) => onChange?.({ ...rangeValue, end: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                )
            }
            case 'currency':
                return (
                    <div>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                            <input
                                type="number"
                                value={value || ''}
                                onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
                                className="w-full pl-12 pr-4 py-3 text-lg font-semibold text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="0,00"
                            />
                        </div>
                    </div>
                )
            case 'currency_range': {
                const currencyRangeValue = typeof value === 'object' ? value : { min: '', max: '' }
                return (
                    <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">Faixa de Valor</label>
                        <div className="flex gap-3 items-center">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Mínimo</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                                    <input
                                        type="number"
                                        value={currencyRangeValue?.min ?? ''}
                                        onChange={(e) => onChange?.({ ...currencyRangeValue, min: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <span className="text-gray-400 font-medium mt-5">até</span>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Máximo</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">R$</span>
                                    <input
                                        type="number"
                                        value={currencyRangeValue?.max ?? ''}
                                        onChange={(e) => onChange?.({ ...currencyRangeValue, max: parseFloat(e.target.value) || 0 })}
                                        className="w-full pl-10 pr-3 py-2.5 text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
            case 'json':
                return (
                    <textarea
                        value={typeof value === 'object' ? JSON.stringify(value, null, 2) : (value || '')}
                        onChange={(e) => {
                            try {
                                const parsed = JSON.parse(e.target.value)
                                onChange?.(parsed)
                            } catch (err) {
                                // Allow typing invalid JSON, but maybe don't trigger onChange or handle it gracefully?
                                // For now, let's just pass the string if it fails parsing, or maybe just let them type
                                // A better JSON editor would be nice, but for now a textarea is fine.
                                // Actually, passing the string might break the type if the parent expects object.
                                // Let's just pass the string and let the parent handle validation/parsing if needed,
                                // or better: keep local state?
                                // For simplicity in this renderer, we assume the parent handles the value.
                                onChange?.(e.target.value)
                            }
                        }}
                        className="w-full px-3 py-2.5 text-sm font-mono border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-gray-50/50 focus:bg-white min-h-[120px]"
                        placeholder="{}"
                    />
                )
            default: // text, number
                return (
                    <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={value || ''}
                        onChange={(e) => onChange?.(e.target.value)}
                        className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                        placeholder={field.label || ''}
                    />
                )
        }
    }

    // --- DISPLAY MODE (Card) ---

    // 1. Specialized Fields
    if (field.key === 'motivo') {
        return <FieldCard icon={Tag} iconColor="bg-purple-100 text-purple-600" label={field.label} value={value} status={status} sdrValue={sdrValue} onEdit={onEdit} correctionMode={correctionMode} showSdrSection={isPlanner} />
    }
    if (field.key === 'destinos') {
        return <FieldCard icon={MapPin} iconColor="bg-blue-100 text-blue-600" label={field.label} value={Array.isArray(value) ? value.join(' • ') : value} status={status} sdrValue={Array.isArray(sdrValue) ? sdrValue.join(' • ') : sdrValue} onEdit={onEdit} correctionMode={correctionMode} showSdrSection={isPlanner} />
    }
    if (field.type === 'date_range' || field.key === 'epoca_viagem') {
        // Handle all date range formats: {start, end}, {inicio, fim}, or raw string
        let startStr = ''
        let endStr = ''
        let isFlexible = false

        if (value) {
            if (typeof value === 'object') {
                startStr = value.start || value.inicio
                endStr = value.end || value.fim
                isFlexible = value.flexivel
            } else if (typeof value === 'string') {
                // Try to parse raw string if it looks like a date
                // Match "YYYY-MM-DD... até YYYY-MM-DD..." or just "YYYY-MM-DD"
                const rangeMatch = value.match(/^(\d{4}-\d{2}-\d{2}).*?até\s+(\d{4}-\d{2}-\d{2})/)
                const singleMatch = value.match(/^(\d{4}-\d{2}-\d{2})/)

                if (rangeMatch) {
                    startStr = rangeMatch[1]
                    endStr = rangeMatch[2]
                } else if (singleMatch) {
                    startStr = singleMatch[1]
                }
            }
        }

        const displayVal = startStr ? (
            <>
                {formatDate(startStr)}
                {endStr && ` até ${formatDate(endStr)}`}
            </>
        ) : (typeof value === 'string' ? value : undefined) // Fallback to raw string if parsing failed but it has content

        const subVal = isFlexible ? '📌 Datas flexíveis' : undefined

        // SDR Value Parsing
        let sdrDisplay = undefined
        if (sdrValue) {
            if (typeof sdrValue === 'object') {
                const sStart = sdrValue.start || sdrValue.inicio
                if (sStart) sdrDisplay = formatDate(sStart)
            } else if (typeof sdrValue === 'string' && sdrValue.match(/^\d{4}-\d{2}-\d{2}/)) {
                sdrDisplay = formatDate(sdrValue)
            }
        }

        return <FieldCard icon={Calendar} iconColor="bg-orange-100 text-orange-600" label={field.label} value={displayVal} subValue={subVal} status={status} sdrValue={sdrDisplay} onEdit={onEdit} correctionMode={correctionMode} showSdrSection={isPlanner} />
    }
    if (field.key === 'orcamento') {
        const displayVal = value?.total ? formatBudget(value.total) : undefined
        const subVal = value?.por_pessoa ? `${formatBudget(value.por_pessoa)} por pessoa` : undefined
        const sdrDisplay = sdrValue?.total ? formatBudget(sdrValue.total) : undefined

        return <FieldCard icon={DollarSign} iconColor="bg-green-100 text-green-600" label={field.label} value={displayVal} subValue={subVal} status={status} sdrValue={sdrDisplay} onEdit={onEdit} correctionMode={correctionMode} showSdrSection={isPlanner} />
    }
    if (field.key === 'taxa_planejamento') {
        const displayValue = value === 'Cortesia' ? 'Cortesia' : (typeof value === 'number' ? formatBudget(value) : value)
        const sdrDisplay = sdrValue === 'Cortesia' ? 'Cortesia' : (typeof sdrValue === 'number' ? formatBudget(sdrValue) : sdrValue)

        return <FieldCard icon={Banknote} iconColor="bg-emerald-100 text-emerald-600" label={field.label} value={displayValue} status={status} sdrValue={sdrDisplay} onEdit={onEdit} correctionMode={correctionMode} showSdrSection={isPlanner} />
    }

    // 2. Generic Fields
    let GenericIcon = Type
    let genericColor = "bg-gray-100 text-gray-600"
    let displayValue = value
    let sdrDisplayValue = sdrValue

    if (field.type === 'number') {
        GenericIcon = Hash
        genericColor = "bg-gray-100 text-gray-600"
    }
    if (field.type === 'currency') {
        GenericIcon = DollarSign
        genericColor = "bg-emerald-100 text-emerald-600"
        if (typeof displayValue === 'number') displayValue = formatBudget(displayValue)
        if (typeof sdrDisplayValue === 'number') sdrDisplayValue = formatBudget(sdrDisplayValue)
    }
    if (field.type === 'currency_range') {
        GenericIcon = DollarSign
        genericColor = "bg-emerald-100 text-emerald-600"
        if (typeof displayValue === 'object' && (displayValue?.min !== undefined || displayValue?.max !== undefined)) {
            const minVal = displayValue.min !== undefined ? formatBudget(displayValue.min) : '?'
            const maxVal = displayValue.max !== undefined ? formatBudget(displayValue.max) : '?'
            displayValue = `${minVal} — ${maxVal}`
        } else {
            displayValue = undefined
        }
        if (typeof sdrDisplayValue === 'object' && (sdrDisplayValue?.min !== undefined || sdrDisplayValue?.max !== undefined)) {
            const minVal = sdrDisplayValue.min !== undefined ? formatBudget(sdrDisplayValue.min) : '?'
            const maxVal = sdrDisplayValue.max !== undefined ? formatBudget(sdrDisplayValue.max) : '?'
            sdrDisplayValue = `${minVal} — ${maxVal}`
        }
    }
    if (field.type === 'date') {
        GenericIcon = CalendarDays
        genericColor = "bg-orange-100 text-orange-600"
        if (typeof displayValue === 'string') displayValue = formatDate(displayValue)
        if (typeof sdrDisplayValue === 'string') sdrDisplayValue = formatDate(sdrDisplayValue)
    }
    if (field.type === 'datetime') {
        GenericIcon = CalendarDays
        genericColor = "bg-orange-100 text-orange-600"
        // Format datetime string "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM"
        const formatDateTime = (str: string) => {
            if (!str) return ''
            // Normalize the string - replace space with T if needed
            const normalized = str.includes('T') ? str : str.replace(' ', 'T')
            const [datePart, timePart] = normalized.split('T')
            const formattedDate = formatDate(datePart)
            const formattedTime = timePart ? ` às ${timePart.substring(0, 5)}` : ''
            return formattedDate + formattedTime
        }
        if (typeof displayValue === 'string') displayValue = formatDateTime(displayValue)
        if (typeof sdrDisplayValue === 'string') sdrDisplayValue = formatDateTime(sdrDisplayValue)
    }
    if (field.type === 'date_range') {
        GenericIcon = CalendarDays
        genericColor = "bg-orange-100 text-orange-600"

        // Check if field has includeTime option
        const fieldOpts = typeof field.options === 'object' && !Array.isArray(field.options) ? field.options : {}
        const includeTime = (fieldOpts as any)?.includeTime || false

        const formatDateTime = (str: string) => {
            if (!str) return ''
            // Check if it's a datetime-local string (contains T)
            if (str.includes('T') && includeTime) {
                const [datePart, timePart] = str.split('T')
                const formattedDate = formatDate(datePart)
                const formattedTime = timePart ? ` às ${timePart.substring(0, 5)}` : ''
                return formattedDate + formattedTime
            }
            return formatDate(str)
        }

        if (typeof displayValue === 'object' && displayValue?.start && displayValue?.end) {
            displayValue = `${formatDateTime(displayValue.start)} — ${formatDateTime(displayValue.end)}`
        } else if (typeof displayValue === 'object' && displayValue?.start) {
            displayValue = formatDateTime(displayValue.start)
        } else {
            displayValue = undefined
        }

        if (typeof sdrDisplayValue === 'object' && sdrDisplayValue?.start && sdrDisplayValue?.end) {
            sdrDisplayValue = `${formatDateTime(sdrDisplayValue.start)} — ${formatDateTime(sdrDisplayValue.end)}`
        }
    }
    if (field.type === 'select') {
        GenericIcon = List
        genericColor = "bg-indigo-100 text-indigo-600"
    }
    if (field.type === 'multiselect') {
        GenericIcon = List
        genericColor = "bg-indigo-100 text-indigo-600"
        if (Array.isArray(displayValue)) displayValue = displayValue.join(' • ')
        if (Array.isArray(sdrDisplayValue)) sdrDisplayValue = sdrDisplayValue.join(' • ')
    }
    if (field.type === 'checklist') {
        // Checklist needs custom rendering - show actual items with check/uncheck status
        // Support for new value structure: { selected: [...], explanations: {...} }
        const hasExplanations = options.some((opt: any) => opt.requiresExplanation)

        let checkedValues: string[] = []
        let explanations: Record<string, string> = {}

        if (hasExplanations && typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkedValues = Array.isArray(value.selected) ? value.selected : []
            explanations = value.explanations || {}
        } else {
            checkedValues = Array.isArray(value) ? value : (value ? [value] : [])
        }

        return (
            <div
                className={cn(
                    "group relative p-4 rounded-xl border transition-all duration-200 bg-white",
                    "border-gray-300 hover:shadow-md cursor-pointer hover:border-indigo-400"
                )}
                onClick={onEdit}
            >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Edit2 className="h-4 w-4 text-indigo-500" />
                </div>

                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-green-100 text-green-600">
                        <CheckSquare className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide mb-2 text-gray-500">
                            {field.label}
                        </p>

                        {/* Render each checklist item */}
                        <div className="space-y-2">
                            {options.length === 0 ? (
                                <span className="text-gray-400 italic text-sm">Nenhum item configurado</span>
                            ) : (
                                options.map((opt: any, idx: number) => {
                                    const optValue = typeof opt === 'object' ? opt.value : opt
                                    const optLabel = typeof opt === 'object' ? opt.label : opt
                                    const requiresExplanation = typeof opt === 'object' ? opt.requiresExplanation : false
                                    const isChecked = checkedValues.includes(optValue)
                                    const explanation = explanations[optValue]

                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div
                                                className={cn(
                                                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm",
                                                    isChecked
                                                        ? "bg-green-50 text-green-800"
                                                        : "bg-gray-50 text-gray-500"
                                                )}
                                            >
                                                {isChecked ? (
                                                    <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                                                ) : (
                                                    <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                )}
                                                <span className={isChecked ? "font-medium" : ""}>{optLabel}</span>
                                                {isChecked && requiresExplanation && explanation && (
                                                    <span className="ml-auto text-xs text-amber-600">📝</span>
                                                )}
                                            </div>
                                            {/* Show explanation if exists */}
                                            {isChecked && requiresExplanation && explanation && (
                                                <div className="ml-6 px-3 py-2 bg-amber-50 border border-amber-100 rounded-md">
                                                    <p className="text-xs text-amber-800 italic">{explanation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )
    }
    if (field.type === 'boolean') {
        GenericIcon = CheckSquare
        genericColor = "bg-teal-100 text-teal-600"
        displayValue = displayValue === true ? 'Sim' : (displayValue === false ? 'Não' : undefined)
        sdrDisplayValue = sdrDisplayValue === true ? 'Sim' : (sdrDisplayValue === false ? 'Não' : undefined)
    }
    if (field.type === 'json') {
        GenericIcon = Type
        genericColor = "bg-gray-100 text-gray-600"
        if (typeof displayValue === 'object') displayValue = JSON.stringify(displayValue)
    }

    return (
        <FieldCard
            icon={GenericIcon}
            iconColor={genericColor}
            label={field.label}
            value={displayValue}
            status={status}
            sdrValue={sdrDisplayValue}
            onEdit={onEdit}
            correctionMode={correctionMode}
            showSdrSection={isPlanner}
        />
    )
}
