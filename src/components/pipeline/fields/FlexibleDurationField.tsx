import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'
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

function parseInput(input: string): { min?: number; max?: number } {
    const cleaned = input.trim().toLowerCase().replace(/dias?/g, '').trim()

    // "5 a 10" or "5-10" or "5 - 10"
    const rangeMatch = cleaned.match(/^(\d+)\s*[-a]\s*(\d+)$/)
    if (rangeMatch) {
        return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) }
    }

    // "5" or "10"
    const singleMatch = cleaned.match(/^(\d+)$/)
    if (singleMatch) {
        const num = parseInt(singleMatch[1])
        return { min: num, max: num }
    }

    return {}
}

function buildDisplay(dias_min?: number, dias_max?: number): string {
    if (!dias_min) return ''
    if (!dias_max || dias_min === dias_max) {
        return `${dias_min} ${dias_min === 1 ? 'dia' : 'dias'}`
    }
    return `${dias_min} a ${dias_max} dias`
}

function formatInputValue(dias_min?: number, dias_max?: number): string {
    if (!dias_min) return ''
    if (!dias_max || dias_min === dias_max) return String(dias_min)
    return `${dias_min} a ${dias_max}`
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
    const [inputValue, setInputValue] = useState(() => {
        if (value?.tipo === 'indefinido') return ''
        return formatInputValue(value?.dias_min, value?.dias_max)
    })
    const [indefinido, setIndefinido] = useState(value?.tipo === 'indefinido')

    useEffect(() => {
        if (value?.tipo === 'indefinido') {
            setInputValue('')
            setIndefinido(true)
        } else {
            setInputValue(formatInputValue(value?.dias_min, value?.dias_max))
            setIndefinido(false)
        }
    }, [value])

    const handleInputChange = (newValue: string) => {
        setInputValue(newValue)
        setIndefinido(false)

        const parsed = parseInput(newValue)
        if (parsed.min) {
            const tipo: DuracaoTipo = parsed.max && parsed.max !== parsed.min ? 'range' : 'fixo'
            onChange?.({
                tipo,
                dias_min: parsed.min,
                dias_max: parsed.max || parsed.min,
                display: buildDisplay(parsed.min, parsed.max)
            })
        } else if (!newValue.trim()) {
            onChange?.(null)
        }
    }

    const handleIndefinidoToggle = () => {
        const newValue = !indefinido
        setIndefinido(newValue)
        if (newValue) {
            setInputValue('')
            onChange?.({ tipo: 'indefinido', display: 'A definir' })
        } else {
            onChange?.(null)
        }
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

    return (
        <FieldWrapper label={label} required={required} error={error} helpText={helpText}>
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onBlur={() => onSave?.()}
                        disabled={indefinido}
                        placeholder="Ex: 7 ou 5 a 10"
                        className={cn(
                            "w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg text-sm",
                            "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
                            indefinido && "opacity-40 cursor-not-allowed bg-gray-50"
                        )}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                        dias
                    </span>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={indefinido}
                        onChange={handleIndefinidoToggle}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-600">Não definiu ainda</span>
                </label>
            </div>
        </FieldWrapper>
    )
}
