/**
 * FlightSegmentEditor - Elite flight segment editor for multi-leg itineraries
 * 
 * Features:
 * - Support for multiple flight segments (legs)
 * - Visual segment cards with departure/arrival details
 * - Add/remove/reorder segments
 * - Airline selector with logos
 * - Date/time pickers for departure and arrival
 */

import { useCallback } from 'react'
import { Plus, Trash2, GripVertical, Plane } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Airline options with codes
const AIRLINES = [
    { code: 'LA', name: 'LATAM', color: 'bg-indigo-100 text-indigo-700' },
    { code: 'G3', name: 'GOL', color: 'bg-orange-100 text-orange-700' },
    { code: 'AD', name: 'Azul', color: 'bg-blue-100 text-blue-700' },
    { code: 'AA', name: 'American', color: 'bg-red-100 text-red-700' },
    { code: 'UA', name: 'United', color: 'bg-sky-100 text-sky-700' },
    { code: 'DL', name: 'Delta', color: 'bg-blue-100 text-blue-700' },
    { code: 'AF', name: 'Air France', color: 'bg-blue-100 text-blue-700' },
    { code: 'BA', name: 'British Airways', color: 'bg-red-100 text-red-700' },
    { code: 'IB', name: 'Iberia', color: 'bg-red-100 text-red-700' },
    { code: 'TP', name: 'TAP Portugal', color: 'bg-emerald-100 text-emerald-700' },
    { code: 'AZ', name: 'ITA Airways', color: 'bg-emerald-100 text-emerald-700' },
    { code: 'LH', name: 'Lufthansa', color: 'bg-yellow-100 text-yellow-700' },
    { code: 'EK', name: 'Emirates', color: 'bg-amber-100 text-amber-700' },
    { code: 'OTHER', name: 'Outra', color: 'bg-slate-100 text-slate-700' },
]

export interface FlightSegment {
    id: string
    segment_order: number
    airline_code: string
    airline_name: string
    flight_number: string
    departure_date: string
    departure_time: string
    departure_airport: string
    departure_city: string
    arrival_date: string
    arrival_time: string
    arrival_airport: string
    arrival_city: string
    cabin_class?: string
    baggage_included?: string
}

interface FlightSegmentEditorProps {
    segments: FlightSegment[]
    onChange: (segments: FlightSegment[]) => void
}

function createEmptySegment(order: number): FlightSegment {
    return {
        id: `seg-${Date.now()}-${order}`,
        segment_order: order,
        airline_code: 'LA',
        airline_name: 'LATAM',
        flight_number: '',
        departure_date: '',
        departure_time: '',
        departure_airport: '',
        departure_city: '',
        arrival_date: '',
        arrival_time: '',
        arrival_airport: '',
        arrival_city: '',
        cabin_class: 'Economy',
        baggage_included: '',
    }
}

export function FlightSegmentEditor({ segments, onChange }: FlightSegmentEditorProps) {
    const handleAddSegment = useCallback(() => {
        const newSegment = createEmptySegment(segments.length + 1)
        onChange([...segments, newSegment])
    }, [segments, onChange])

    const handleRemoveSegment = useCallback((index: number) => {
        const newSegments = segments.filter((_, i) => i !== index)
            .map((seg, i) => ({ ...seg, segment_order: i + 1 }))
        onChange(newSegments)
    }, [segments, onChange])

    const handleUpdateSegment = useCallback((index: number, updates: Partial<FlightSegment>) => {
        const newSegments = [...segments]
        newSegments[index] = { ...newSegments[index], ...updates }
        onChange(newSegments)
    }, [segments, onChange])

    const handleAirlineChange = useCallback((index: number, code: string) => {
        const airline = AIRLINES.find(a => a.code === code) || AIRLINES[0]
        handleUpdateSegment(index, {
            airline_code: code,
            airline_name: airline.name
        })
    }, [handleUpdateSegment])

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Plane className="h-4 w-4 text-sky-600" />
                    <span className="text-xs font-medium text-sky-700">
                        Trechos do Itinerário ({segments.length})
                    </span>
                </div>
            </div>

            {/* Segments List */}
            {segments.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-sky-200 rounded-lg bg-sky-50/50 text-center">
                    <p className="text-sm text-sky-600 mb-2">Nenhum trecho adicionado</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddSegment}
                        className="border-sky-300 text-sky-700 hover:bg-sky-100"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Adicionar Primeiro Trecho
                    </Button>
                </div>
            ) : (
                <div className="space-y-3">
                    {segments.map((segment, index) => (
                        <SegmentCard
                            key={segment.id}
                            segment={segment}
                            index={index}
                            total={segments.length}
                            onUpdate={(updates) => handleUpdateSegment(index, updates)}
                            onRemove={() => handleRemoveSegment(index)}
                            onAirlineChange={(code) => handleAirlineChange(index, code)}
                        />
                    ))}

                    {/* Add More Button */}
                    <button
                        onClick={handleAddSegment}
                        className="w-full py-3 border-2 border-dashed border-sky-200 rounded-lg text-sky-600 hover:border-sky-400 hover:bg-sky-50 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="text-sm font-medium">Adicionar Trecho</span>
                    </button>
                </div>
            )}
        </div>
    )
}

// Individual Segment Card
interface SegmentCardProps {
    segment: FlightSegment
    index: number
    total: number
    onUpdate: (updates: Partial<FlightSegment>) => void
    onRemove: () => void
    onAirlineChange: (code: string) => void
}

function SegmentCard({ segment, index, total, onUpdate, onRemove, onAirlineChange }: SegmentCardProps) {
    const airline = AIRLINES.find(a => a.code === segment.airline_code) || AIRLINES[0]

    return (
        <div className="bg-white border border-sky-200 rounded-xl overflow-hidden shadow-sm">
            {/* Card Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-sky-50 border-b border-sky-100">
                <GripVertical className="h-4 w-4 text-sky-300 cursor-grab" />
                <div className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium",
                    airline.color
                )}>
                    Trecho {index + 1} de {total}
                </div>
                <div className="flex-1" />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Card Content */}
            <div className="p-4 space-y-4">
                {/* Airline and Flight Number Row */}
                <div className="grid grid-cols-2 gap-3">
                    {/* Airline Selector */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Companhia</label>
                        <select
                            value={segment.airline_code}
                            onChange={(e) => onAirlineChange(e.target.value)}
                            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
                        >
                            {AIRLINES.map(a => (
                                <option key={a.code} value={a.code}>{a.name}</option>
                            ))}
                        </select>
                    </div>
                    {/* Flight Number */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Nº do Voo</label>
                        <input
                            type="text"
                            value={segment.flight_number}
                            onChange={(e) => onUpdate({ flight_number: e.target.value })}
                            placeholder="4904"
                            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none"
                        />
                    </div>
                </div>

                {/* Departure and Arrival */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Departure */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-sky-500" />
                            <span className="text-xs font-medium text-sky-700">SAÍDA</span>
                        </div>
                        <div className="bg-sky-50 rounded-lg p-3 space-y-2 border border-sky-100">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={segment.departure_date}
                                    onChange={(e) => onUpdate({ departure_date: e.target.value })}
                                    className="w-full h-8 px-2 text-xs border border-sky-200 rounded bg-white"
                                />
                                <input
                                    type="time"
                                    value={segment.departure_time}
                                    onChange={(e) => onUpdate({ departure_time: e.target.value })}
                                    className="w-full h-8 px-2 text-xs border border-sky-200 rounded bg-white"
                                />
                            </div>
                            <input
                                type="text"
                                value={segment.departure_airport}
                                onChange={(e) => onUpdate({ departure_airport: e.target.value.toUpperCase() })}
                                placeholder="GRU"
                                maxLength={3}
                                className="w-full h-8 px-2 text-sm font-bold text-center border border-sky-200 rounded bg-white uppercase"
                            />
                            <input
                                type="text"
                                value={segment.departure_city}
                                onChange={(e) => onUpdate({ departure_city: e.target.value })}
                                placeholder="São Paulo Guarulhos"
                                className="w-full h-8 px-2 text-xs border border-sky-200 rounded bg-white"
                            />
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-xs font-medium text-emerald-700">CHEGADA</span>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-3 space-y-2 border border-emerald-100">
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={segment.arrival_date}
                                    onChange={(e) => onUpdate({ arrival_date: e.target.value })}
                                    className="w-full h-8 px-2 text-xs border border-emerald-200 rounded bg-white"
                                />
                                <input
                                    type="time"
                                    value={segment.arrival_time}
                                    onChange={(e) => onUpdate({ arrival_time: e.target.value })}
                                    className="w-full h-8 px-2 text-xs border border-emerald-200 rounded bg-white"
                                />
                            </div>
                            <input
                                type="text"
                                value={segment.arrival_airport}
                                onChange={(e) => onUpdate({ arrival_airport: e.target.value.toUpperCase() })}
                                placeholder="BOG"
                                maxLength={3}
                                className="w-full h-8 px-2 text-sm font-bold text-center border border-emerald-200 rounded bg-white uppercase"
                            />
                            <input
                                type="text"
                                value={segment.arrival_city}
                                onChange={(e) => onUpdate({ arrival_city: e.target.value })}
                                placeholder="Bogotá El Dorado"
                                className="w-full h-8 px-2 text-xs border border-emerald-200 rounded bg-white"
                            />
                        </div>
                    </div>
                </div>

                {/* Optional: Class and Baggage */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Classe</label>
                        <select
                            value={segment.cabin_class || 'Economy'}
                            onChange={(e) => onUpdate({ cabin_class: e.target.value })}
                            className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                        >
                            <option value="Economy">Econômica</option>
                            <option value="Premium Economy">Premium Economy</option>
                            <option value="Business">Executiva</option>
                            <option value="First">Primeira Classe</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Bagagem</label>
                        <input
                            type="text"
                            value={segment.baggage_included || ''}
                            onChange={(e) => onUpdate({ baggage_included: e.target.value })}
                            placeholder="2x 23kg"
                            className="w-full h-8 px-2 text-xs border border-slate-200 rounded-lg bg-white"
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FlightSegmentEditor
