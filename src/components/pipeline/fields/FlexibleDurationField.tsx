import { useState, useEffect } from 'react'
import { Clock, ChevronDown, Check } from 'lucide-react'
import { FieldWrapper, DisplayValue } from './BaseField'
import type { BaseFieldProps } from './BaseField'
import { cn } from '../../../lib/utils'

type DuracaoTipo = 'fixo' | 'range' | 'indefinido'

export interface DuracaoViagem {
    tipo: DuracaoTipo
    dias_min?: number
    dias_max?: number
    display: string
}

const TIPOS = [
    { value: 'fixo' as DuracaoTipo, label: 'Dias fixos', description: 'Ex: 7 dias' },
    { value: 'range' as DuracaoTipo, label: 'Range de dias', description: 'Ex: 5 a 7 dias' },
    { value: 'indefinido' as DuracaoTipo, label: 'Ainda não definido', description: 'Cliente não sabe' }
]

const PRESET_DURATIONS = [
    { min: 3, max: 3, label: '3 dias' },
    { min: 5, max: 5, label: '5 dias' },
    { min: 7, max: 7, label: '7 dias' },
    { min: 10, max: 10, label: '10 dias' },
    { min: 14, max: 14, label: '14 dias' },
    { min: 5, max: 7, label: '5-7 dias' },
    { min: 7, max: 10, label: '7-10 dias' },
    { min: 10, max: 14, label: '10-14 dias' }
]

function buildDisplay(data: Partial<DuracaoViagem>): string {
    const { tipo, dias_min, dias_max } = data

    if (tipo === 'indefinido') return 'A definir'

    if (tipo === 'fixo' && dias_min) {
        return `${dias_min} ${dias_min === 1 ? 'dia' : 'dias'}`
    }

    if (tipo === 'range' && dias_min && dias_max) {
        if (dias_min === dias_max) {
            return `${dias_min} ${dias_min === 1 ? 'dia' : 'dias'}`
        }
        return `${dias_min} a ${dias_max} dias`
    }

    return ''
}

export default function FlexibleDurationField({
    label,
    value,
    onChange,
    onSave,
    readOnly = false,
    required = false,
    error,
    helpText
}: BaseFieldProps) {
    const [localData, setLocalData] = useState<DuracaoViagem>(() => {
        if (value?.tipo) {
            return value as DuracaoViagem
        }
        return {
            tipo: 'range',
            dias_min: 5,
            dias_max: 7,
            display: '5 a 7 dias'
        }
    })

    const [showTypeDropdown, setShowTypeDropdown] = useState(false)

    useEffect(() => {
        if (value?.tipo) {
            setLocalData(value as DuracaoViagem)
        }
    }, [value])

    const updateData = (updates: Partial<DuracaoViagem>) => {
        const newData = { ...localData, ...updates }
        newData.display = buildDisplay(newData)
        setLocalData(newData)
        onChange?.(newData)
    }

    const handleTypeChange = (tipo: DuracaoTipo) => {
        const newData: DuracaoViagem = {
            tipo,
            display: ''
        }

        if (tipo === 'fixo') {
            newData.dias_min = localData.dias_min || 7
            newData.dias_max = newData.dias_min
        } else if (tipo === 'range') {
            newData.dias_min = localData.dias_min || 5
            newData.dias_max = localData.dias_max || 7
        }

        newData.display = buildDisplay(newData)
        setLocalData(newData)
        onChange?.(newData)
        setShowTypeDropdown(false)
    }

    const handlePresetClick = (preset: typeof PRESET_DURATIONS[0]) => {
        const isRange = preset.min !== preset.max
        const newData: DuracaoViagem = {
            tipo: isRange ? 'range' : 'fixo',
            dias_min: preset.min,
            dias_max: preset.max,
            display: preset.label
        }
        setLocalData(newData)
        onChange?.(newData)
        onSave?.()
    }

    // Display Mode
    if (readOnly || !onChange) {
        return (
            <FieldWrapper label={label} required={required} helpText={helpText}>
                {value?.display ? (
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span>{value.display}</span>
                    </div>
                ) : (
                    <DisplayValue value={null} />
                )}
            </FieldWrapper>
        )
    }

    const selectedTipo = TIPOS.find(t => t.value === localData.tipo)

    return (
        <FieldWrapper label={label} required={required} error={error} helpText={helpText}>
            <div className="space-y-4">
                {/* Type Selector */}
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <div className="text-left">
                            <div className="text-sm font-medium text-gray-900">{selectedTipo?.label}</div>
                            <div className="text-xs text-gray-500">{selectedTipo?.description}</div>
                        </div>
                        <ChevronDown className={cn(
                            "h-5 w-5 text-gray-400 transition-transform",
                            showTypeDropdown && "rotate-180"
                        )} />
                    </button>

                    {showTypeDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            {TIPOS.map(tipo => (
                                <button
                                    key={tipo.value}
                                    type="button"
                                    onClick={() => handleTypeChange(tipo.value)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0",
                                        localData.tipo === tipo.value && "bg-indigo-50"
                                    )}
                                >
                                    <div className="text-left">
                                        <div className="text-sm font-medium text-gray-900">{tipo.label}</div>
                                        <div className="text-xs text-gray-500">{tipo.description}</div>
                                    </div>
                                    {localData.tipo === tipo.value && (
                                        <Check className="h-4 w-4 text-indigo-600" />
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Presets */}
                {localData.tipo !== 'indefinido' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-2">Durações comuns:</label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_DURATIONS.map((preset, idx) => {
                                const isSelected = localData.dias_min === preset.min && localData.dias_max === preset.max
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handlePresetClick(preset)}
                                        className={cn(
                                            "px-3 py-1.5 text-sm rounded-full border transition-all",
                                            isSelected
                                                ? "bg-indigo-600 text-white border-indigo-600"
                                                : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50"
                                        )}
                                    >
                                        {preset.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Custom Input */}
                {localData.tipo === 'fixo' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ou digite um valor específico:</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={localData.dias_min || ''}
                                onChange={(e) => {
                                    const dias = parseInt(e.target.value) || 0
                                    updateData({ dias_min: dias, dias_max: dias })
                                }}
                                onBlur={() => onSave?.()}
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-center"
                                placeholder="7"
                            />
                            <span className="text-sm text-gray-600">dias</span>
                        </div>
                    </div>
                )}

                {localData.tipo === 'range' && (
                    <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Ou defina um range personalizado:</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={localData.dias_min || ''}
                                onChange={(e) => updateData({ dias_min: parseInt(e.target.value) || 0 })}
                                onBlur={() => onSave?.()}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-center"
                                placeholder="5"
                            />
                            <span className="text-sm text-gray-600">a</span>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={localData.dias_max || ''}
                                onChange={(e) => updateData({ dias_max: parseInt(e.target.value) || 0 })}
                                onBlur={() => onSave?.()}
                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-center"
                                placeholder="7"
                            />
                            <span className="text-sm text-gray-600">dias</span>
                        </div>
                    </div>
                )}

                {localData.tipo === 'indefinido' && (
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-600 text-center">
                            O cliente ainda não definiu a duração da viagem
                        </p>
                    </div>
                )}

                {/* Preview */}
                {localData.display && localData.tipo !== 'indefinido' && (
                    <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-indigo-600" />
                            <span className="text-sm font-medium text-indigo-900">{localData.display}</span>
                        </div>
                    </div>
                )}
            </div>
        </FieldWrapper>
    )
}
