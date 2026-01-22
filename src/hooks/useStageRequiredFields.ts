import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

interface SystemField {
    key: string
    label: string
    type: string
    options: string[] | null
    section: string
}

interface StageFieldConfig {
    field_key: string
    is_required: boolean
    is_visible: boolean
    system_fields: SystemField
}

/**
 * Hook to fetch required fields for a specific pipeline stage.
 * Respects the modular governance config from stage_field_config.
 */
export function useStageRequiredFields(stageId: string | null) {
    return useQuery({
        queryKey: ['stage-required-fields', stageId],
        enabled: !!stageId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        queryFn: async () => {
            if (!stageId) return []

            const { data, error } = await supabase
                .from('stage_field_config')
                .select(`
          field_key,
          is_required,
          is_visible,
          system_fields!inner(key, label, type, options, section)
        `)
                .eq('stage_id', stageId)
                .eq('is_required', true)
                .eq('is_visible', true)

            if (error) {
                console.error('Error fetching stage required fields:', error)
                throw error
            }

            // Transform to flat structure with field info
            return (data as StageFieldConfig[]).map(config => ({
                key: config.field_key,
                label: config.system_fields.label,
                type: config.system_fields.type,
                options: config.system_fields.options,
                section: config.system_fields.section,
                isRequired: config.is_required
            }))
        }
    })
}

/**
 * Hook to fetch all visible fields for a specific pipeline stage (not just required).
 */
export function useStageVisibleFields(stageId: string | null) {
    return useQuery({
        queryKey: ['stage-visible-fields', stageId],
        enabled: !!stageId,
        staleTime: 1000 * 60 * 5,
        queryFn: async () => {
            if (!stageId) return []

            const { data, error } = await supabase
                .from('stage_field_config')
                .select(`
          field_key,
          is_required,
          is_visible,
          system_fields!inner(key, label, type, options, section)
        `)
                .eq('stage_id', stageId)
                .eq('is_visible', true)

            if (error) throw error

            return (data as StageFieldConfig[]).map(config => ({
                key: config.field_key,
                label: config.system_fields.label,
                type: config.system_fields.type,
                options: config.system_fields.options,
                section: config.system_fields.section,
                isRequired: config.is_required
            }))
        }
    })
}
