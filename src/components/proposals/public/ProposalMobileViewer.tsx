import { useState, useMemo } from 'react'
import type { ProposalFull } from '@/types/proposals'
import { CoverSection } from './CoverSection'
import { ContentSection } from './ContentSection'
import { StickyFooter } from './StickyFooter'

interface ProposalMobileViewerProps {
    proposal: ProposalFull
}

export function ProposalMobileViewer({ proposal }: ProposalMobileViewerProps) {
    const version = proposal.active_version
    const sections = version?.sections || []

    // Track client selections (item_id -> selected, option_id)
    const [selections, setSelections] = useState<Record<string, { selected: boolean; optionId?: string }>>(() => {
        const initial: Record<string, { selected: boolean; optionId?: string }> = {}
        sections.forEach(section => {
            section.items.forEach(item => {
                if (item.is_optional) {
                    initial[item.id] = { selected: item.is_default_selected }
                } else {
                    initial[item.id] = { selected: true }
                }
            })
        })
        return initial
    })

    const handleToggleItem = (itemId: string) => {
        setSelections(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], selected: !prev[itemId]?.selected }
        }))
    }

    const handleSelectOption = (itemId: string, optionId: string) => {
        setSelections(prev => ({
            ...prev,
            [itemId]: { ...prev[itemId], optionId }
        }))
    }

    // Calculate total based on selections
    const total = useMemo(() => {
        let sum = 0
        sections.forEach(section => {
            section.items.forEach(item => {
                const sel = selections[item.id]
                if (sel?.selected) {
                    sum += Number(item.base_price) || 0
                    // Add option delta if selected
                    if (sel.optionId) {
                        const option = item.options.find(o => o.id === sel.optionId)
                        if (option) {
                            sum += Number(option.price_delta) || 0
                        }
                    }
                }
            })
        })
        return sum
    }, [sections, selections])

    // Find cover section if exists
    const coverSection = sections.find(s => s.section_type === 'cover')
    const contentSections = sections.filter(s => s.section_type !== 'cover')

    return (
        <div className="min-h-dvh bg-gradient-to-br from-slate-50 to-blue-50 pb-24">
            {/* Cover/Hero */}
            {coverSection ? (
                <CoverSection
                    section={coverSection}
                    title={version?.title || 'Sua Viagem'}
                />
            ) : (
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-8 pt-12">
                    <h1 className="text-3xl font-bold mb-2">{version?.title || 'Sua Viagem'}</h1>
                    <p className="text-blue-100">Proposta personalizada</p>
                </div>
            )}

            {/* Content Sections */}
            <div className="px-4 py-6 space-y-6">
                {contentSections.map(section => (
                    <ContentSection
                        key={section.id}
                        section={section}
                        selections={selections}
                        onToggleItem={handleToggleItem}
                        onSelectOption={handleSelectOption}
                    />
                ))}
            </div>

            {/* Sticky Footer */}
            <StickyFooter
                total={total}
                proposalId={proposal.id}
            />
        </div>
    )
}
