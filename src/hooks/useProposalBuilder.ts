import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
    Proposal,
    ProposalVersion,
    ProposalSection,
    ProposalItem,
    ProposalOption,
    ProposalSectionWithItems,
    ProposalItemWithOptions,
    ProposalSectionType,
    ProposalItemType,
} from '@/types/proposals'
import { SECTION_TYPE_CONFIG } from '@/types/proposals'
import type { LibrarySearchResult } from '@/hooks/useLibrary'

// ============================================
// Builder Store State
// ============================================
interface ProposalBuilderState {
    // Core data
    proposal: Proposal | null
    version: ProposalVersion | null
    sections: ProposalSectionWithItems[]

    // UI state
    isDirty: boolean
    isSaving: boolean
    lastSavedAt: Date | null
    selectedSectionId: string | null
    selectedItemId: string | null

    // Actions
    initialize: (proposal: Proposal, version: ProposalVersion, sections: ProposalSectionWithItems[]) => void
    reset: () => void

    // Section actions
    addSection: (type: ProposalSectionType, title?: string) => void
    removeSection: (sectionId: string) => void
    updateSection: (sectionId: string, updates: Partial<ProposalSection>) => void
    reorderSections: (orderedIds: string[]) => void
    selectSection: (sectionId: string | null) => void

    // Item actions
    addItem: (sectionId: string, type: ProposalItemType, title: string) => void
    addItemFromLibrary: (sectionId: string, libraryItem: LibrarySearchResult) => void
    removeItem: (itemId: string) => void
    updateItem: (itemId: string, updates: Partial<ProposalItem>) => void
    reorderItems: (sectionId: string, orderedIds: string[]) => void
    selectItem: (itemId: string | null) => void

    // Option actions
    addOption: (itemId: string, label: string) => void
    removeOption: (optionId: string) => void
    updateOption: (optionId: string, updates: Partial<ProposalOption>) => void

    // Persistence
    save: () => Promise<void>
    publish: () => Promise<string>
}

// ============================================
// Zustand Store
// ============================================
export const useProposalBuilder = create<ProposalBuilderState>((set, get) => ({
    // Initial state
    proposal: null,
    version: null,
    sections: [],
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    selectedSectionId: null,
    selectedItemId: null,

    // Initialize with existing data
    initialize: (proposal, version, sections) => {
        set({
            proposal,
            version,
            sections,
            isDirty: false,
            lastSavedAt: new Date(),
            selectedSectionId: null,
            selectedItemId: null,
        })
    },

    reset: () => {
        set({
            proposal: null,
            version: null,
            sections: [],
            isDirty: false,
            isSaving: false,
            lastSavedAt: null,
            selectedSectionId: null,
            selectedItemId: null,
        })
    },

    // ============================================
    // Section Actions
    // ============================================
    addSection: (type, title) => {
        const { sections } = get()
        const config = SECTION_TYPE_CONFIG[type]

        const newSection: ProposalSectionWithItems = {
            id: crypto.randomUUID(),
            version_id: get().version?.id || '',
            section_type: type,
            title: title || config.defaultTitle,
            ordem: sections.length,
            config: {},
            visible: true,
            created_at: new Date().toISOString(),
            items: [],
        }

        set({
            sections: [...sections, newSection],
            isDirty: true,
            selectedSectionId: newSection.id,
        })
    },

    removeSection: (sectionId) => {
        const { sections } = get()
        set({
            sections: sections.filter(s => s.id !== sectionId),
            isDirty: true,
            selectedSectionId: null,
        })
    },

    updateSection: (sectionId, updates) => {
        const { sections } = get()
        set({
            sections: sections.map(s =>
                s.id === sectionId ? { ...s, ...updates } : s
            ),
            isDirty: true,
        })
    },

    reorderSections: (orderedIds) => {
        const { sections } = get()
        const reordered = orderedIds
            .map((id, index) => {
                const section = sections.find(s => s.id === id)
                if (section) return { ...section, ordem: index }
                return null
            })
            .filter(Boolean) as ProposalSectionWithItems[]

        set({ sections: reordered, isDirty: true })
    },

    selectSection: (sectionId) => {
        set({ selectedSectionId: sectionId, selectedItemId: null })
    },

    // ============================================
    // Item Actions
    // ============================================
    addItem: (sectionId, type, title) => {
        const { sections } = get()

        const newItem: ProposalItemWithOptions = {
            id: crypto.randomUUID(),
            section_id: sectionId,
            item_type: type,
            title,
            description: null,
            rich_content: {},
            base_price: 0,
            ordem: 0,
            is_optional: false,
            is_default_selected: true,
            created_at: new Date().toISOString(),
            options: [],
        }

        set({
            sections: sections.map(s => {
                if (s.id === sectionId) {
                    const items = [...s.items, { ...newItem, ordem: s.items.length }]
                    return { ...s, items }
                }
                return s
            }),
            isDirty: true,
            selectedItemId: newItem.id,
        })
    },

    addItemFromLibrary: (sectionId, libraryItem) => {
        const { sections } = get()

        // Map library category to proposal item type
        // proposal_item_type enum: hotel, flight, transfer, experience, service, insurance, fee, custom
        const categoryToItemType: Record<string, ProposalItemType> = {
            hotel: 'hotel',
            experience: 'experience',
            transfer: 'transfer',
            flight: 'flight',
            service: 'service',
            text_block: 'custom',
            custom: 'custom',
        }

        const itemType = categoryToItemType[libraryItem.category] || 'custom'

        const newItem: ProposalItemWithOptions = {
            id: crypto.randomUUID(),
            section_id: sectionId,
            item_type: itemType,
            title: libraryItem.name,
            description: null, // Library items don't have description field
            rich_content: (libraryItem.content || {}) as any,
            base_price: libraryItem.base_price || 0,
            ordem: 0,
            is_optional: false,
            is_default_selected: true,
            created_at: new Date().toISOString(),
            options: [],
        }

        set({
            sections: sections.map(s => {
                if (s.id === sectionId) {
                    const items = [...s.items, { ...newItem, ordem: s.items.length }]
                    return { ...s, items }
                }
                return s
            }),
            isDirty: true,
            selectedItemId: newItem.id,
        })
    },

    removeItem: (itemId) => {
        const { sections } = get()
        set({
            sections: sections.map(s => ({
                ...s,
                items: s.items.filter(i => i.id !== itemId)
            })),
            isDirty: true,
            selectedItemId: null,
        })
    },

    updateItem: (itemId, updates) => {
        const { sections } = get()
        set({
            sections: sections.map(s => ({
                ...s,
                items: s.items.map(i =>
                    i.id === itemId ? { ...i, ...updates } : i
                )
            })),
            isDirty: true,
        })
    },

    reorderItems: (sectionId, orderedIds) => {
        const { sections } = get()
        set({
            sections: sections.map(s => {
                if (s.id !== sectionId) return s
                const reordered = orderedIds
                    .map((id, index) => {
                        const item = s.items.find(i => i.id === id)
                        if (item) return { ...item, ordem: index }
                        return null
                    })
                    .filter(Boolean) as ProposalItemWithOptions[]
                return { ...s, items: reordered }
            }),
            isDirty: true,
        })
    },

    selectItem: (itemId) => {
        set({ selectedItemId: itemId })
    },

    // ============================================
    // Option Actions
    // ============================================
    addOption: (itemId, label) => {
        const { sections } = get()

        const newOption: ProposalOption = {
            id: crypto.randomUUID(),
            item_id: itemId,
            option_label: label,
            description: null,
            price_delta: 0,
            details: {},
            ordem: 0,
            created_at: new Date().toISOString(),
        }

        set({
            sections: sections.map(s => ({
                ...s,
                items: s.items.map(i => {
                    if (i.id !== itemId) return i
                    const options = [...i.options, { ...newOption, ordem: i.options.length }]
                    return { ...i, options }
                })
            })),
            isDirty: true,
        })
    },

    removeOption: (optionId) => {
        const { sections } = get()
        set({
            sections: sections.map(s => ({
                ...s,
                items: s.items.map(i => ({
                    ...i,
                    options: i.options.filter(o => o.id !== optionId)
                }))
            })),
            isDirty: true,
        })
    },

    updateOption: (optionId, updates) => {
        const { sections } = get()
        set({
            sections: sections.map(s => ({
                ...s,
                items: s.items.map(i => ({
                    ...i,
                    options: i.options.map(o =>
                        o.id === optionId ? { ...o, ...updates } : o
                    )
                }))
            })),
            isDirty: true,
        })
    },

    // ============================================
    // Persistence
    // ============================================
    save: async () => {
        const { proposal, version, sections, isSaving } = get()
        if (!proposal || !version || isSaving) return

        set({ isSaving: true })

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('Not authenticated')

            // Create new version
            const { data: newVersion, error: versionError } = await supabase
                .from('proposal_versions')
                .insert({
                    proposal_id: proposal.id,
                    version_number: version.version_number + 1,
                    title: version.title,
                    metadata: version.metadata,
                    created_by: user.id,
                    change_summary: 'Atualização automática',
                })
                .select()
                .single()

            if (versionError) throw versionError

            // Insert sections
            for (const section of sections) {
                const { data: newSection, error: sectionError } = await supabase
                    .from('proposal_sections')
                    .insert({
                        version_id: newVersion.id,
                        section_type: section.section_type,
                        title: section.title,
                        ordem: section.ordem,
                        config: section.config,
                        visible: section.visible,
                    })
                    .select()
                    .single()

                if (sectionError) throw sectionError

                // Insert items
                for (const item of section.items) {
                    const { data: newItem, error: itemError } = await supabase
                        .from('proposal_items')
                        .insert({
                            section_id: newSection.id,
                            item_type: item.item_type,
                            title: item.title,
                            description: item.description,
                            rich_content: item.rich_content,
                            base_price: item.base_price,
                            ordem: item.ordem,
                            is_optional: item.is_optional,
                            is_default_selected: item.is_default_selected,
                        })
                        .select()
                        .single()

                    if (itemError) throw itemError

                    // Insert options
                    if (item.options.length > 0) {
                        const { error: optionsError } = await supabase
                            .from('proposal_options')
                            .insert(
                                item.options.map(opt => ({
                                    item_id: newItem.id,
                                    option_label: opt.option_label,
                                    description: opt.description,
                                    price_delta: opt.price_delta,
                                    details: opt.details,
                                    ordem: opt.ordem,
                                }))
                            )
                        if (optionsError) throw optionsError
                    }
                }
            }

            // Update proposal active version
            await supabase
                .from('proposals')
                .update({ active_version_id: newVersion.id })
                .eq('id', proposal.id)

            set({
                version: newVersion as any,
                isDirty: false,
                isSaving: false,
                lastSavedAt: new Date(),
            })
        } catch (error) {
            console.error('Error saving proposal:', error)
            set({ isSaving: false })
            throw error
        }
    },

    publish: async () => {
        const { proposal, isDirty } = get()
        if (!proposal) throw new Error('No proposal loaded')

        // Save first if dirty
        if (isDirty) {
            await get().save()
        }

        // Update status to sent
        const { data, error } = await supabase
            .from('proposals')
            .update({ status: 'sent' })
            .eq('id', proposal.id)
            .select('public_token')
            .single()

        if (error) throw error

        set({ proposal: { ...proposal, status: 'sent' } })

        return (data as any).public_token!
    },
}))
