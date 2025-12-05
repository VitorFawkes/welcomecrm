import { MapPin, Plus, X } from 'lucide-react'
import { FieldWrapper } from './BaseField'
import type { BaseFieldProps } from './BaseField'

export default function DestinosField({
    label,
    value,
    onChange,
    onSave,
    readOnly = false,
    required = false,
    error,
    helpText
}: BaseFieldProps) {
    const destinos = (value as string[] | null | undefined) || []

    const addDestino = () => {
        if (onChange) onChange([...destinos, ''])
    }

    const removeDestino = (index: number) => {
        if (onChange) {
            onChange(destinos.filter((_, i) => i !== index))
            // Auto-save after removing
            setTimeout(() => onSave?.(), 100)
        }
    }

    const updateDestino = (index: number, newValue: string) => {
        if (!onChange) return
        const updated = [...destinos]
        updated[index] = newValue
        onChange(updated)
    }

    if (readOnly || !onChange) {
        return (
            <FieldWrapper label={label} required={required} helpText={helpText}>
                {destinos.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {destinos.map((destino, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                            >
                                <MapPin className="h-3 w-3" />
                                {destino}
                            </span>
                        ))}
                    </div>
                ) : (
                    <span className="text-sm text-gray-400 italic">Nenhum destino informado</span>
                )}
            </FieldWrapper>
        )
    }

    return (
        <FieldWrapper label={label} required={required} error={error} helpText={helpText}>
            <div className="space-y-2">
                {destinos.map((destino, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            value={destino}
                            onChange={(e) => updateDestino(idx, e.target.value)}
                            onBlur={() => onSave?.()}
                            placeholder="Nome do destino"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => removeDestino(idx)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addDestino}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Adicionar Destino
                </button>
            </div>
        </FieldWrapper>
    )
}
