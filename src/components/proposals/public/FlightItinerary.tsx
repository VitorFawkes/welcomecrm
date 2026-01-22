/**
 * FlightItinerary - Premium visual timeline for multi-leg flight itineraries
 * 
 * Features:
 * - Intelligent IDA/VOLTA grouping based on first and last airport
 * - Visual timeline with connections
 * - Automatic duration and connection time calculation
 * - Airline branding with colored badges
 * - Table-style display matching the source image
 */

import type { ProposalItemWithOptions } from '@/types/proposals'
import { Plane, Clock, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FlightSegment {
    id?: string
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

interface FlightItineraryProps {
    item: ProposalItemWithOptions
    isSelected: boolean
    onToggle: () => void
}

// Airline colors
const AIRLINE_COLORS: Record<string, { bg: string; text: string }> = {
    'LA': { bg: 'bg-indigo-600', text: 'text-white' },
    'G3': { bg: 'bg-orange-500', text: 'text-white' },
    'AD': { bg: 'bg-blue-600', text: 'text-white' },
    'AA': { bg: 'bg-red-600', text: 'text-white' },
    'UA': { bg: 'bg-sky-600', text: 'text-white' },
    'DL': { bg: 'bg-blue-700', text: 'text-white' },
    'AF': { bg: 'bg-blue-800', text: 'text-white' },
    'TP': { bg: 'bg-emerald-600', text: 'text-white' },
    'IB': { bg: 'bg-red-700', text: 'text-white' },
    'LH': { bg: 'bg-yellow-500', text: 'text-slate-900' },
}

function formatDateShort(dateStr: string): string {
    if (!dateStr) return ''
    try {
        const date = new Date(dateStr + 'T00:00:00')
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } catch {
        return dateStr
    }
}

function formatTime(timeStr: string): string {
    if (!timeStr) return '--:--'
    return timeStr.substring(0, 5)
}

function calculateDuration(dep: { date: string; time: string }, arr: { date: string; time: string }): string {
    if (!dep.date || !dep.time || !arr.date || !arr.time) return ''
    try {
        const depDate = new Date(`${dep.date}T${dep.time}`)
        const arrDate = new Date(`${arr.date}T${arr.time}`)
        const diffMs = arrDate.getTime() - depDate.getTime()
        const hours = Math.floor(diffMs / (1000 * 60 * 60))
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`
    } catch {
        return ''
    }
}

// Intelligently group segments into IDA and VOLTA
function groupSegments(segments: FlightSegment[]): { ida: FlightSegment[]; volta: FlightSegment[] } {
    if (segments.length === 0) return { ida: [], volta: [] }
    if (segments.length === 1) return { ida: segments, volta: [] }

    // Get first origin and check when we return to it
    const originAirport = segments[0].departure_airport

    // Find the index where we start returning to origin
    let returnStartIndex = -1
    for (let i = 1; i < segments.length; i++) {
        if (segments[i].arrival_airport === originAirport) {
            // This segment ends at origin, so it's the last segment of volta
            // The volta starts from the segment that leads here
            // Find where this return journey starts
            for (let j = i; j >= 1; j--) {
                if (segments[j - 1].arrival_airport === segments[j].departure_airport) {
                    returnStartIndex = j
                } else {
                    break
                }
            }
            if (returnStartIndex === -1) returnStartIndex = i
            break
        }
    }

    if (returnStartIndex === -1) {
        // No clear return, try to split in half or by date gap
        const midpoint = Math.ceil(segments.length / 2)
        return {
            ida: segments.slice(0, midpoint),
            volta: segments.slice(midpoint)
        }
    }

    return {
        ida: segments.slice(0, returnStartIndex),
        volta: segments.slice(returnStartIndex)
    }
}

export function FlightItinerary({ item, isSelected, onToggle }: FlightItineraryProps) {
    const richContent = (item.rich_content as Record<string, unknown>) || {}
    const segments = ((richContent.segments as FlightSegment[]) || []).map((seg, idx) => ({
        ...seg,
        id: seg.id || `seg-${idx}`
    }))

    const formatPrice = (value: number | string) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(Number(value) || 0)

    // If no segments, show placeholder
    if (segments.length === 0) {
        return (
            <div className="p-6 bg-sky-50 rounded-xl border-2 border-dashed border-sky-200 text-center">
                <Plane className="h-10 w-10 text-sky-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-sky-700">Nenhum trecho configurado</p>
                <p className="text-xs text-sky-500 mt-1">Adicione trechos ou envie uma imagem</p>
            </div>
        )
    }

    // Group into IDA and VOLTA
    const { ida, volta } = groupSegments(segments)

    return (
        <button
            onClick={onToggle}
            className={cn(
                "w-full text-left rounded-xl border-2 overflow-hidden transition-all duration-200",
                isSelected
                    ? "border-emerald-400 bg-white shadow-lg ring-2 ring-emerald-400/20"
                    : "border-slate-200 bg-white hover:border-sky-300 hover:shadow-md"
            )}
        >
            {/* Header */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3 transition-colors",
                isSelected ? "bg-emerald-50" : "bg-gradient-to-r from-sky-50 to-indigo-50"
            )}>
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-emerald-100" : "bg-sky-100"
                    )}>
                        <Plane className={cn(
                            "h-5 w-5",
                            isSelected ? "text-emerald-600" : "text-sky-600"
                        )} />
                    </div>
                    <div>
                        <span className="font-semibold text-slate-800 block">
                            {item.title || 'Itinerário Aéreo'}
                        </span>
                        <span className="text-xs text-slate-500">
                            {segments.length} trecho{segments.length > 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                <div className={cn(
                    "font-bold text-lg",
                    isSelected ? "text-emerald-600" : "text-slate-700"
                )}>
                    {formatPrice(item.base_price)}
                </div>
            </div>

            {/* Flight Table */}
            <div className="divide-y divide-slate-100">
                {/* IDA Section */}
                {ida.length > 0 && (
                    <div>
                        <div className="px-4 py-2 bg-sky-50 border-b border-sky-100">
                            <span className="text-xs font-bold text-sky-700 uppercase tracking-wide flex items-center gap-2">
                                <Plane className="h-3 w-3" />
                                IDA
                            </span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {ida.map((segment) => (
                                <SegmentRow key={segment.id} segment={segment} />
                            ))}
                        </div>
                    </div>
                )}

                {/* VOLTA Section */}
                {volta.length > 0 && (
                    <div>
                        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                            <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide flex items-center gap-2">
                                <Plane className="h-3 w-3 rotate-180" />
                                VOLTA
                            </span>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {volta.map((segment) => (
                                <SegmentRow key={segment.id} segment={segment} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer: Class & Baggage */}
            {(segments[0]?.cabin_class || segments[0]?.baggage_included) && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center gap-3 text-xs">
                    {segments[0].cabin_class && (
                        <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">
                            {segments[0].cabin_class}
                        </span>
                    )}
                    {segments[0].baggage_included && (
                        <span className="text-emerald-600 font-medium">✓ {segments[0].baggage_included}</span>
                    )}
                </div>
            )}

            {/* Selection Indicator */}
            {isSelected && (
                <div className="px-4 py-2 bg-emerald-500 text-white text-center text-sm font-semibold">
                    ✓ Selecionado
                </div>
            )}
        </button>
    )
}

// Individual Segment Row - Table style matching the original image
function SegmentRow({ segment }: { segment: FlightSegment }) {
    const airlineStyle = AIRLINE_COLORS[segment.airline_code] || { bg: 'bg-slate-600', text: 'text-white' }
    const duration = calculateDuration(
        { date: segment.departure_date, time: segment.departure_time },
        { date: segment.arrival_date, time: segment.arrival_time }
    )

    return (
        <div className="px-4 py-3 hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
                {/* Airline Badge */}
                <div className={cn(
                    "px-2 py-1 rounded text-xs font-bold min-w-[60px] text-center",
                    airlineStyle.bg, airlineStyle.text
                )}>
                    {segment.airline_name}
                </div>

                {/* Flight Number */}
                <span className="text-xs text-slate-500 font-mono min-w-[50px]">
                    {segment.flight_number}
                </span>

                {/* Route with dates/times */}
                <div className="flex-1 flex items-center gap-2">
                    {/* Departure */}
                    <div className="text-right">
                        <div className="text-xs text-slate-400">{formatDateShort(segment.departure_date)}</div>
                        <div className="font-semibold text-slate-800">{formatTime(segment.departure_time)}</div>
                    </div>

                    {/* From Airport */}
                    <div className="text-center min-w-[50px]">
                        <div className="font-bold text-slate-800">{segment.departure_airport}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[80px]" title={segment.departure_city}>
                            {segment.departure_city?.split(' ')[0]}
                        </div>
                    </div>

                    {/* Arrow + Duration */}
                    <div className="flex flex-col items-center px-2">
                        <ArrowRight className="h-4 w-4 text-slate-300" />
                        {duration && (
                            <span className="text-xs text-slate-400 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" />
                                {duration}
                            </span>
                        )}
                    </div>

                    {/* To Airport */}
                    <div className="text-center min-w-[50px]">
                        <div className="font-bold text-slate-800">{segment.arrival_airport}</div>
                        <div className="text-xs text-slate-400 truncate max-w-[80px]" title={segment.arrival_city}>
                            {segment.arrival_city?.split(' ')[0]}
                        </div>
                    </div>

                    {/* Arrival */}
                    <div className="text-left">
                        <div className="text-xs text-slate-400">{formatDateShort(segment.arrival_date)}</div>
                        <div className="font-semibold text-slate-800">{formatTime(segment.arrival_time)}</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default FlightItinerary
