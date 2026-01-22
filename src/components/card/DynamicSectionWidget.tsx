/**
 * DynamicSectionWidget - Production-grade section component matching ObservacoesEstruturadas patterns
 * 
 * Features:
 * - Inline editing (fields are ALWAYS editable, no toggle)
 * - Dirty state tracking with "Salvar Alterações" button
 * - Data stored in cards.produto_data[section.key]
 * - Uses UniversalFieldRenderer for consistent field rendering
 * - Respects field visibility rules from stage_field_config
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Check, Loader2, Layers } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useFieldConfig } from '../../hooks/useFieldConfig'
import { useSections } from '../../hooks/useSections'
import UniversalFieldRenderer from '../fields/UniversalFieldRenderer'
import { cn } from '../../lib/utils'
import type { Database } from '../../database.types'
import * as Icons from 'lucide-react'
import { ProposalsWidget } from './ProposalsWidget'

// ═══════════════════════════════════════════════════════════
// WIDGET REGISTRY - Maps widget_component values to React components
// Add new widgets here when creating specialized section components
// ═══════════════════════════════════════════════════════════
const WIDGET_REGISTRY: Record<string, React.ComponentType<{ cardId: string }>> = {
    proposals: ProposalsWidget,
}

type Card = Database['public']['Tables']['cards']['Row']

interface DynamicSectionWidgetProps {
    card: Card
    sectionKey: string
    /** Class to apply to the wrapper */
    className?: string
}

/**
 * DynamicSectionWidget - Renders any section dynamically with inline editing
 * Matches the exact UX of ObservacoesEstruturadas
 */
export default function DynamicSectionWidget({
    card,
    sectionKey,
    className
}: DynamicSectionWidgetProps) {
    const queryClient = useQueryClient()

    // Data Sources - Marketing and governable fields are stored at TOP level of produto_data
    // NOT nested under section key (e.g., produto_data.utm_source, NOT produto_data.marketing.utm_source)
    const productData = useMemo(() => (card.produto_data as Record<string, any>) || {}, [card.produto_data])

    // State
    const [editedData, setEditedData] = useState<Record<string, any>>({})
    const [lastSavedData, setLastSavedData] = useState<Record<string, any>>({})
    const [isDirty, setIsDirty] = useState(false)

    // Fetch section metadata
    const { data: sections = [], isLoading: loadingSections } = useSections()
    const section = useMemo(() => sections.find(s => s.key === sectionKey), [sections, sectionKey])

    // Fetch field configuration
    const { getVisibleFields, isLoading: loadingFields } = useFieldConfig()

    // Get visible fields for this section at the current stage
    const fields = useMemo(() => {
        if (!card.pipeline_stage_id) return []
        return getVisibleFields(card.pipeline_stage_id, sectionKey)
    }, [card.pipeline_stage_id, sectionKey, getVisibleFields])

    // Get current data for this section's fields from produto_data (TOP LEVEL)
    // Each field's value lives at produto_data[field.key], NOT produto_data[section.key][field.key]
    const sectionData = useMemo(() => {
        const data: Record<string, any> = {}
        fields.forEach(field => {
            data[field.key] = productData[field.key]
        })
        return data
    }, [productData, fields])

    // Sync local state when sectionData changes
    useEffect(() => {
        setEditedData(sectionData)
        setLastSavedData(sectionData)
        setIsDirty(false)
    }, [sectionData])

    // Mutation to save changes - writes to TOP level of produto_data
    const updateCard = useMutation({
        mutationFn: async (newData: Record<string, any>) => {
            const { error } = await supabase
                .from('cards')
                .update({
                    produto_data: {
                        ...productData,
                        ...newData // Merge fields at top level
                    }
                })
                .eq('id', card.id!)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['card-detail', card.id] })
            setLastSavedData(editedData)
            setIsDirty(false)
        }
    })

    const handleSave = async () => {
        if (!isDirty) return
        try {
            await updateCard.mutateAsync(editedData)
        } catch (error) {
            console.error('Failed to save section:', error)
        }
    }

    const handleChange = useCallback((key: string, value: any) => {
        setEditedData(prev => {
            const next = { ...prev, [key]: value }
            setIsDirty(JSON.stringify(next) !== JSON.stringify(lastSavedData))
            return next
        })
    }, [lastSavedData])

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault()
            handleSave()
        }
    }

    // Get dynamic icon component
    const IconComponent = useMemo(() => {
        if (!section?.icon) return Layers
        const iconName = section.icon.charAt(0).toUpperCase() +
            section.icon.slice(1).replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
        return (Icons as any)[iconName] || Layers
    }, [section?.icon])

    // Loading state
    if (loadingFields || loadingSections) {
        return (
            <div className="rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-3">
                    <div className="h-4 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                </div>
                <div className="p-4 space-y-4">
                    <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                    <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
                </div>
            </div>
        )
    }

    // No fields visible for this section
    if (fields.length === 0) {
        return null
    }

    // Parse section color classes
    const colorClasses = section?.color || 'bg-slate-50 text-slate-700 border-slate-100'
    const [bgClass, textClass] = colorClasses.split(' ')
    const iconBgClass = bgClass.replace('-50', '-100')

    return (
        <div className={cn(
            "rounded-xl border border-gray-300 bg-white shadow-sm overflow-hidden",
            className
        )}>
            {/* Header - matches ObservacoesEstruturadas */}
            <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={cn("p-1.5 rounded-lg", iconBgClass)}>
                            <IconComponent className={cn("h-4 w-4", textClass)} />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">
                            {section?.label || sectionKey}
                        </h3>
                    </div>

                    {/* Save Button - only shows when dirty, matches ObservacoesEstruturadas */}
                    {updateCard.isPending ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Salvando...
                        </div>
                    ) : isDirty ? (
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                        >
                            <Check className="h-3 w-3" />
                            Salvar Alterações
                        </button>
                    ) : updateCard.isSuccess ? (
                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                            <Check className="h-3 w-3" />
                            Salvo
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Content - fields always in edit mode, matches ObservacoesEstruturadas */}
            <div className="p-4" onKeyDown={handleKeyDown}>
                <div className="space-y-4">
                    {fields.map((field) => (
                        <div key={field.key}>
                            <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                {field.label}
                            </label>
                            <UniversalFieldRenderer
                                field={{
                                    key: field.key,
                                    label: field.label,
                                    type: field.type as any,
                                    options: field.options
                                }}
                                value={editedData[field.key]}
                                mode="edit"
                                onChange={(val) => handleChange(field.key, val)}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// DynamicSectionsList - Renders all sections for a position
// ═══════════════════════════════════════════════════════════

interface DynamicSectionsListProps {
    card: Card
    position: 'left_column' | 'right_column'
    /** Section keys to exclude (e.g., system sections with dedicated components) */
    excludeKeys?: string[]
}

export function DynamicSectionsList({ card, position, excludeKeys = [] }: DynamicSectionsListProps) {
    const { data: sections = [], isLoading } = useSections()

    const positionedSections = useMemo(() => {
        return sections
            .filter(s => s.position === position)
            .filter(s => !excludeKeys.includes(s.key))
            // Render widget-based sections OR non-system custom sections
            .filter(s => s.widget_component || !s.is_system)
    }, [sections, position, excludeKeys])

    if (isLoading) {
        return (
            <div className="animate-pulse">
                <div className="h-32 bg-gray-100 rounded-xl"></div>
            </div>
        )
    }

    // Don't render anything if no sections in this position
    if (positionedSections.length === 0) {
        return null
    }

    return (
        <>
            {positionedSections.map(section => {
                // If section has a custom widget, render it
                if (section.widget_component && WIDGET_REGISTRY[section.widget_component]) {
                    const WidgetComponent = WIDGET_REGISTRY[section.widget_component]
                    return <WidgetComponent key={section.key} cardId={card.id!} />
                }

                // Otherwise render as dynamic fields section
                return (
                    <DynamicSectionWidget
                        key={section.key}
                        card={card}
                        sectionKey={section.key}
                    />
                )
            })}
        </>
    )
}
