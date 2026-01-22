/**
 * SectionNav - Sticky navigation for quick section jumping
 * 
 * Features:
 * - Horizontal scrollable pills on mobile
 * - Sticky positioning after hero
 * - Active section indicator
 * - Smooth scroll to section
 */

import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Plane, Building2, Bus, Star, Shield, FileText } from 'lucide-react'

interface Section {
    id: string
    title: string
    section_type: string
}

interface SectionNavProps {
    sections: Section[]
    activeSection?: string
    onSectionClick: (sectionId: string) => void
}

const SECTION_ICONS: Record<string, React.ElementType> = {
    flights: Plane,
    hotels: Building2,
    transfers: Bus,
    experiences: Star,
    insurance: Shield,
    custom: FileText,
}

// Remove emoji from title
function cleanTitle(title: string): string {
    return title.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim()
}

export function SectionNav({
    sections,
    activeSection,
    onSectionClick,
}: SectionNavProps) {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [showLeftFade, setShowLeftFade] = useState(false)
    const [showRightFade, setShowRightFade] = useState(false)

    // Check scroll position for fade indicators
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        const checkScroll = () => {
            setShowLeftFade(el.scrollLeft > 10)
            setShowRightFade(el.scrollLeft < el.scrollWidth - el.clientWidth - 10)
        }

        checkScroll()
        el.addEventListener('scroll', checkScroll)
        return () => el.removeEventListener('scroll', checkScroll)
    }, [sections])

    if (sections.length <= 1) return null

    return (
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
            <div className="relative">
                {/* Left fade */}
                {showLeftFade && (
                    <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                )}

                {/* Right fade */}
                {showRightFade && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                )}

                {/* Scrollable pills */}
                <div
                    ref={scrollRef}
                    className="flex items-center gap-2 px-4 py-3 overflow-x-auto scrollbar-hide"
                >
                    {sections.map((section) => {
                        const Icon = SECTION_ICONS[section.section_type] || FileText
                        const isActive = activeSection === section.id

                        return (
                            <button
                                key={section.id}
                                onClick={() => onSectionClick(section.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                                    isActive
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                )}
                            >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                <span>{cleanTitle(section.title)}</span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
