/**
 * SmartSection - Intelligent section renderer with auto-detection
 * 
 * Auto-detection rules:
 * - 2+ items of same type → Radio buttons (client selects ONE)
 * - All items optional → Toggle switches
 * - Single required item → Display only (no interaction)
 * 
 * Grouping:
 * - Hotels: Group by location_city or dates
 * - Experiences: Group by date
 */

import { useMemo } from 'react'
import type { ProposalSectionWithItems, ProposalItemWithOptions } from '@/types/proposals'
import { SECTION_TYPE_CONFIG } from '@/types/proposals'
import * as LucideIcons from 'lucide-react'
import { SelectableItemCard } from './SelectableItemCard'
import { RadioItemCard } from './RadioItemCard'
import { cn } from '@/lib/utils'

// Remove emoji from title for cleaner display
function cleanTitle(title: string): string {
    return title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
}

interface Selection {
    selected: boolean
    optionId?: string
    quantity?: number
}

interface SmartSectionProps {
    section: ProposalSectionWithItems
    selections: Record<string, Selection>
    onToggleItem: (itemId: string) => void
    onSelectItem: (sectionId: string, itemId: string) => void
    onSelectOption: (itemId: string, optionId: string) => void
    onChangeQuantity?: (itemId: string, quantity: number) => void
}

type DisplayMode = 'selectable' | 'toggleable' | 'display'

// Detect how section should be displayed
function detectDisplayMode(section: ProposalSectionWithItems): DisplayMode {
    const items = section.items
    const config = (section.config as Record<string, any>) || {}

    // If explicitly set to multiple selection, use toggleable mode
    if (config.selection_mode === 'multiple') {
        return 'toggleable'
    }

    // 2+ items = selectable (radio buttons) - exclusive by default
    if (items.length >= 2) {
        // Check if all are of same type (hotel with hotel, flight with flight)
        const types = new Set(items.map(i => i.item_type))
        if (types.size === 1) {
            return 'selectable'
        }
    }

    // All optional = toggleable
    if (items.every(i => i.is_optional)) {
        return 'toggleable'
    }

    // Default: just display
    return 'display'
}

// Group items by context (city, date, etc)
interface ItemGroup {
    label: string
    sublabel?: string
    items: ProposalItemWithOptions[]
}

function groupItems(section: ProposalSectionWithItems): ItemGroup[] {
    const items = section.items

    // Hotels: group by city
    if (section.section_type === 'hotels') {
        const byCity = new Map<string, ProposalItemWithOptions[]>()
        items.forEach(item => {
            const city = (item.rich_content as any)?.location_city || 'Hospedagem'
            if (!byCity.has(city)) byCity.set(city, [])
            byCity.get(city)!.push(item)
        })

        // If only one group, return without grouping
        if (byCity.size <= 1) {
            return [{ label: section.title, items }]
        }

        return Array.from(byCity.entries()).map(([city, cityItems]) => ({
            label: city,
            sublabel: formatDateRange(cityItems),
            items: cityItems
        }))
    }

    // Experiences: group by date
    if (section.section_type === 'custom' && items.some(i => (i.rich_content as any)?.date)) {
        const byDate = new Map<string, ProposalItemWithOptions[]>()
        items.forEach(item => {
            const date = (item.rich_content as any)?.date || 'Experiências'
            if (!byDate.has(date)) byDate.set(date, [])
            byDate.get(date)!.push(item)
        })

        if (byDate.size <= 1) {
            return [{ label: section.title, items }]
        }

        return Array.from(byDate.entries()).map(([date, dateItems]) => ({
            label: formatDate(date),
            sublabel: (dateItems[0].rich_content as any)?.location_city,
            items: dateItems
        }))
    }

    // Default: no grouping
    return [{ label: section.title, items }]
}

function formatDateRange(items: ProposalItemWithOptions[]): string | undefined {
    const dates = items
        .map(i => (i.rich_content as any)?.check_in_date)
        .filter(Boolean)
    if (dates.length === 0) return undefined

    try {
        const min = new Date(Math.min(...dates.map(d => new Date(d).getTime())))
        const max = new Date(Math.max(...dates.map(d => new Date(d).getTime())))
        return `${formatDate(min.toISOString())} - ${formatDate(max.toISOString())}`
    } catch {
        return undefined
    }
}

function formatDate(dateStr: string): string {
    try {
        const date = new Date(dateStr)
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    } catch {
        return dateStr
    }
}

// Detect special block types from rich_content
type SpecialBlockType = 'title' | 'text' | 'divider' | 'image' | 'video' | null

function detectSpecialBlock(section: ProposalSectionWithItems): SpecialBlockType {
    if (section.section_type !== 'custom' || section.items.length !== 1) return null
    const rc = (section.items[0].rich_content as Record<string, any>) || {}
    if (rc.is_title_block) return 'title'
    if (rc.is_text_block) return 'text'
    if (rc.is_divider_block) return 'divider'
    if (rc.is_image_block) return 'image'
    if (rc.is_video_block) return 'video'
    return null
}

// Special block renderers - Premium design, no price, no selection
function TitleBlock({ item }: { item: ProposalItemWithOptions }) {
    return (
        <div className="pt-10 pb-4 px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                {item.title}
            </h2>
            <div className="mt-3 h-1 w-16 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full" />
        </div>
    )
}

function TextBlock({ item }: { item: ProposalItemWithOptions }) {
    const content = ((item.rich_content as Record<string, any>)?.content as string) || ''
    return (
        <div className="py-6 px-6">
            <p className="text-base md:text-lg text-slate-600 leading-relaxed font-light whitespace-pre-wrap">
                {content}
            </p>
        </div>
    )
}

function DividerBlock() {
    return (
        <div className="py-8 px-8">
            <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
        </div>
    )
}

function ImageBlock({ item }: { item: ProposalItemWithOptions }) {
    const url = ((item.rich_content as Record<string, any>)?.image_url as string) || ''
    if (!url) return null
    return (
        <div className="py-4">
            <img src={url} alt="" className="w-full rounded-xl" />
        </div>
    )
}

function VideoBlock({ item }: { item: ProposalItemWithOptions }) {
    const url = ((item.rich_content as Record<string, any>)?.video_url as string) || ''
    if (!url) return null

    // Convert YouTube/Vimeo URLs to embed format
    let embedUrl = url
    if (url.includes('youtube.com/watch')) {
        const videoId = new URL(url).searchParams.get('v')
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`
    } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0]
        if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`
    } else if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1]?.split('?')[0]
        if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`
    }

    return (
        <div className="py-4 aspect-video">
            <iframe
                src={embedUrl}
                className="w-full h-full rounded-xl"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
        </div>
    )
}

export function SmartSection({
    section,
    selections,
    onToggleItem,
    onSelectItem,
    onSelectOption,
    onChangeQuantity,
}: SmartSectionProps) {
    // Check for special blocks first
    const specialType = detectSpecialBlock(section)

    // Render special blocks without header/price/selection
    if (specialType === 'title') return <TitleBlock item={section.items[0]} />
    if (specialType === 'text') return <TextBlock item={section.items[0]} />
    if (specialType === 'divider') return <DividerBlock />
    if (specialType === 'image') return <ImageBlock item={section.items[0]} />
    if (specialType === 'video') return <VideoBlock item={section.items[0]} />

    // Normal section rendering
    const config = SECTION_TYPE_CONFIG[section.section_type]
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[config.icon] || LucideIcons.FileText

    const displayMode = useMemo(() => detectDisplayMode(section), [section])
    const groups = useMemo(() => groupItems(section), [section])

    if (section.items.length === 0) return null

    return (
        <section className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Section Header */}
            <header className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    "bg-gradient-to-br from-blue-50 to-indigo-100"
                )}>
                    <IconComponent className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                    <h2 className="font-semibold text-slate-900">{cleanTitle(section.title)}</h2>
                    {displayMode === 'selectable' && (
                        <p className="text-xs text-slate-500">
                            Selecione uma opção
                        </p>
                    )}
                    {displayMode === 'toggleable' && (
                        <p className="text-xs text-slate-500">
                            {section.items.length} {section.items.length === 1 ? 'item opcional' : 'itens opcionais'}
                        </p>
                    )}
                </div>
            </header>

            {/* Groups */}
            <div className="divide-y divide-slate-100">
                {groups.map((group, groupIndex) => (
                    <div key={groupIndex}>
                        {/* Group Header (only if multiple groups) */}
                        {groups.length > 1 && (
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                                <p className="text-sm font-medium text-slate-700">{group.label}</p>
                                {group.sublabel && (
                                    <p className="text-xs text-slate-500">{group.sublabel}</p>
                                )}
                            </div>
                        )}

                        {/* Items in group */}
                        <div className="divide-y divide-slate-50">
                            {group.items.map(item => {
                                const sel = selections[item.id]

                                // Radio mode (selectable - 2+ options)
                                if (displayMode === 'selectable') {
                                    return (
                                        <RadioItemCard
                                            key={item.id}
                                            item={item}
                                            isSelected={sel?.selected ?? false}
                                            selectedOptionId={sel?.optionId}
                                            onSelect={() => onSelectItem(section.id, item.id)}
                                            onSelectOption={(optionId: string) => onSelectOption(item.id, optionId)}
                                            quantity={sel?.quantity}
                                            onChangeQuantity={onChangeQuantity ? (q: number) => onChangeQuantity(item.id, q) : undefined}
                                        />
                                    )
                                }

                                // Toggle mode (optional items)
                                return (
                                    <SelectableItemCard
                                        key={item.id}
                                        item={item}
                                        isSelected={sel?.selected ?? true}
                                        selectedOptionId={sel?.optionId}
                                        onToggle={() => onToggleItem(item.id)}
                                        onSelectOption={(optionId) => onSelectOption(item.id, optionId)}
                                    />
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    )
}
