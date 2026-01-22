/**
 * ProposalMobileViewer V3 - Premium Client Proposal View
 * 
 * Features:
 * - Hero section with destination image
 * - Sticky section navigation
 * - Responsive: mobile-first with desktop sidebar
 * - Glass footer with total
 * - Scroll tracking for active section
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { ProposalFull } from '@/types/proposals'
import { ProposalHero } from './ProposalHero'
import { SectionNav } from './SectionNav'
import { SmartSection } from './SmartSection'
import { AcceptProposalModal } from './AcceptProposalModal'

interface ProposalMobileViewerProps {
    proposal: ProposalFull
}

interface Selection {
    selected: boolean
    optionId?: string
    quantity?: number
}

// Multi-currency config
const CURRENCY_RATES: Record<string, number> = {
    USD: 1,
    BRL: 5.0,
    EUR: 0.92,
}

export function ProposalMobileViewer({ proposal }: ProposalMobileViewerProps) {
    const version = proposal.active_version
    const sections = version?.sections || []

    // Refs for scroll tracking
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeSection, setActiveSection] = useState<string>('')

    // Primary currency from version metadata or default
    const primaryCurrency = (version?.metadata as any)?.currency || 'USD'
    const showSecondary = (version?.metadata as any)?.show_secondary_currency !== false
    const secondaryCurrency = primaryCurrency === 'USD' ? 'BRL' : 'USD'

    // Get hero image from cover section or first item with image
    const heroImage = useMemo(() => {
        const coverSection = sections.find(s => s.section_type === 'cover')
        if (coverSection?.items?.[0]?.image_url) {
            return coverSection.items[0].image_url
        }
        // Fallback to first item with image
        for (const section of sections) {
            for (const item of section.items || []) {
                if (item.image_url) return item.image_url
            }
        }
        return undefined
    }, [sections])

    // Get trip dates and travelers from metadata
    const travelDates = (version?.metadata as any)?.travel_dates
    const travelers = (version?.metadata as any)?.travelers

    // Track selections
    const [selections, setSelections] = useState<Record<string, Selection>>(() => {
        const initial: Record<string, Selection> = {}

        sections.forEach(section => {
            const items = section.items
            const hasMultiple = items.length >= 2

            items.forEach((item, idx) => {
                if (hasMultiple) {
                    initial[item.id] = {
                        selected: idx === 0 || item.is_default_selected,
                        quantity: 1,
                    }
                } else if (item.is_optional) {
                    initial[item.id] = {
                        selected: item.is_default_selected || false,
                        quantity: 1,
                    }
                } else {
                    initial[item.id] = {
                        selected: true,
                        quantity: 1,
                    }
                }
            })
        })

        return initial
    })

    // Scroll tracking for active section - uses container scroll
    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const handleScroll = () => {
            const offsets = Object.entries(sectionRefs.current)
                .filter(([_, el]) => el !== null)
                .map(([id, el]) => ({
                    id,
                    top: el!.getBoundingClientRect().top
                }))
                .filter(({ top }) => top < 200)
                .sort((a, b) => b.top - a.top)

            if (offsets.length > 0) {
                setActiveSection(offsets[0].id)
            }
        }

        container.addEventListener('scroll', handleScroll, { passive: true })
        return () => container.removeEventListener('scroll', handleScroll)
    }, [])

    // Scroll to section using scrollIntoView
    const handleSectionClick = useCallback((sectionId: string) => {
        const el = sectionRefs.current[sectionId]
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
    }, [])

    // Selection handlers
    const handleToggleItem = useCallback((itemId: string) => {
        setSelections(prev => ({
            ...prev,
            [itemId]: {
                ...prev[itemId],
                selected: !prev[itemId]?.selected
            }
        }))
    }, [])

    const handleSelectItem = useCallback((sectionId: string, itemId: string) => {
        const section = sections.find(s => s.id === sectionId)
        if (section) {
            setSelections(prev => {
                const next = { ...prev }
                section.items.forEach(item => {
                    next[item.id] = {
                        ...next[item.id],
                        selected: item.id === itemId
                    }
                })
                return next
            })
        }
    }, [sections])

    const handleSelectOption = useCallback((itemId: string, optionId: string) => {
        setSelections(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], optionId }
        }))
    }, [])

    const handleChangeQuantity = useCallback((itemId: string, quantity: number) => {
        setSelections(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], quantity: Math.max(1, quantity) }
        }))
    }, [])

    // Calculate totals
    const { totalPrimary, totalSecondary } = useMemo(() => {
        let sum = 0

        sections.forEach(section => {
            section.items.forEach(item => {
                const sel = selections[item.id]
                if (sel?.selected) {
                    const basePrice = Number(item.base_price) || 0
                    const quantity = sel.quantity || 1

                    let optionDelta = 0
                    if (sel.optionId) {
                        const option = item.options.find(o => o.id === sel.optionId)
                        if (option) {
                            optionDelta = Number(option.price_delta) || 0
                        }
                    }

                    sum += (basePrice + optionDelta) * quantity
                }
            })
        })

        const rate = CURRENCY_RATES[secondaryCurrency] / CURRENCY_RATES[primaryCurrency]

        return {
            totalPrimary: sum,
            totalSecondary: sum * rate
        }
    }, [sections, selections, primaryCurrency, secondaryCurrency])

    // Format currency
    const formatCurrency = (amount: number, currency: string) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency,
        }).format(amount)

    // Helper: detect special content blocks (title, text, divider, etc.)
    const isSpecialBlock = (section: typeof sections[0]) => {
        if (section.section_type !== 'custom' || section.items.length !== 1) return false
        const rc = (section.items[0]?.rich_content as Record<string, any>) || {}
        return rc.is_title_block || rc.is_text_block || rc.is_divider_block ||
            rc.is_image_block || rc.is_video_block
    }

    // Content sections for tabs (exclude cover AND special blocks)
    const contentSections = sections.filter(s =>
        s.section_type !== 'cover' && !isSpecialBlock(s)
    )

    // Summary items for desktop sidebar (only items with price > 0)
    const summaryItems = useMemo(() => {
        return sections.flatMap(section =>
            section.items
                .filter(item => Number(item.base_price) > 0)  // Only items with actual price
                .map(item => ({
                    id: item.id,
                    title: item.title,
                    price: Number(item.base_price) || 0,
                    quantity: selections[item.id]?.quantity || 1,
                }))
        )
    }, [sections, selections])

    // Modal state
    const [showAcceptModal, setShowAcceptModal] = useState(false)

    return (
        <div ref={containerRef} className="h-screen overflow-y-auto bg-slate-50">
            {/* Left content - Main scrollable area */}
            <div className="lg:mr-[320px]">
                {/* Hero Section */}
                <ProposalHero
                    title={version?.title || 'Sua Viagem'}
                    subtitle="Proposta Exclusiva"
                    imageUrl={heroImage}
                    dates={travelDates}
                    travelers={travelers}
                />

                {/* Section Navigation */}
                <SectionNav
                    sections={contentSections.map(s => ({
                        id: s.id,
                        title: s.title,
                        section_type: s.section_type,
                    }))}
                    activeSection={activeSection}
                    onSectionClick={handleSectionClick}
                />

                {/* Content Sections */}
                <div className="px-4 sm:px-6 py-6 space-y-8 pb-32 lg:pb-8">
                    {contentSections.map(section => (
                        <div
                            key={section.id}
                            ref={el => { sectionRefs.current[section.id] = el }}
                            id={`section-${section.id}`}
                        >
                            <SmartSection
                                section={section}
                                selections={selections}
                                onToggleItem={handleToggleItem}
                                onSelectItem={handleSelectItem}
                                onSelectOption={handleSelectOption}
                                onChangeQuantity={handleChangeQuantity}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop Summary Sidebar - Fixed position */}
            <div className="hidden lg:block fixed top-0 right-0 h-screen w-[320px] border-l border-slate-200 bg-white overflow-y-auto">
                <div className="p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Resumo</h2>
                    <div className="space-y-3 mb-6">
                        {summaryItems.filter(item => selections[item.id]?.selected).map(item => (
                            <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                                <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <svg className="h-3 w-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 truncate">{item.title}</p>
                                </div>
                                <p className="text-sm font-semibold text-slate-900 flex-shrink-0">
                                    {formatCurrency(item.price * (selections[item.id]?.quantity || 1), primaryCurrency)}
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="h-px bg-slate-200 my-4" />
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-600">Total</span>
                            <span className="text-2xl font-bold text-slate-900">
                                {formatCurrency(totalPrimary, primaryCurrency)}
                            </span>
                        </div>
                        {showSecondary && (
                            <p className="text-right text-xs text-slate-500">
                                ≈ {formatCurrency(totalSecondary, secondaryCurrency)}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowAcceptModal(true)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        Confirmar Proposta
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-3">Esta ação não gera cobranças</p>
                </div>
            </div>

            {/* Mobile Sticky Footer - Hidden on desktop */}
            <div className="fixed bottom-0 left-0 right-0 lg:hidden z-50">
                {/* Glass blur backdrop */}
                <div className="absolute inset-0 bg-white/80 backdrop-blur-lg border-t border-slate-200" />

                <div className="relative px-4 py-3 safe-area-inset-bottom">
                    {/* Total display */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-600">Total</span>
                        <div className="text-right">
                            <p className="text-xl font-bold text-slate-900">
                                {formatCurrency(totalPrimary, primaryCurrency)}
                            </p>
                            {showSecondary && (
                                <p className="text-xs text-slate-500">
                                    ≈ {formatCurrency(totalSecondary, secondaryCurrency)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* CTA Button - Green for confirmation */}
                    <button
                        onClick={() => setShowAcceptModal(true)}
                        className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-emerald-600/25"
                    >
                        Confirmar Proposta
                    </button>
                </div>
            </div>



            {/* Accept Proposal Modal */}
            <AcceptProposalModal
                isOpen={showAcceptModal}
                onClose={() => setShowAcceptModal(false)}
                proposalId={proposal.id}
                versionId={version?.id || ''}
                total={totalPrimary}
                currency={primaryCurrency}
                selections={selections}
            />
        </div>
    )
}
