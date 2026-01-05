
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Database } from '../database.types'

type SystemField = Database['public']['Tables']['system_fields']['Row']
type StageFieldConfig = Database['public']['Tables']['stage_field_config']['Row']

export interface FieldConfigResult {
    key: string
    label: string
    type: string
    section: string
    isVisible: boolean
    isRequired: boolean
    isHeader: boolean
    customLabel?: string | null
    options?: any
}

export function useFieldConfig() {
    // Fetch System Fields (The Dictionary)
    const { data: systemFields, isLoading: loadingFields } = useQuery({
        queryKey: ['system-fields-config'],
        queryFn: async () => {
            const { data } = await supabase
                .from('system_fields')
                .select('*')
                .eq('active', true)
                .order('section')
                .order('label')
            return data as SystemField[]
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    // Fetch Stage Configs (The Rules)
    const { data: stageConfigs, isLoading: loadingConfigs } = useQuery({
        queryKey: ['stage-field-configs-all'],
        queryFn: async () => {
            const { data } = await supabase
                .from('stage_field_config')
                .select('*')
            return data as StageFieldConfig[]
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    const isLoading = loadingFields || loadingConfigs

    // Helper: Get config for a specific field in a stage
    const getFieldConfig = (stageId: string, fieldKey: string): FieldConfigResult | null => {
        if (!systemFields) return null

        const field = systemFields.find(f => f.key === fieldKey)
        if (!field) return null

        const config = stageConfigs?.find(c => c.stage_id === stageId && c.field_key === fieldKey)

        return {
            key: field.key,
            label: config?.custom_label || field.label,
            type: field.type,
            section: field.section || 'details',
            isVisible: config?.is_visible ?? true, // Default visible
            isRequired: config?.is_required ?? false,
            isHeader: config?.show_in_header ?? false,
            customLabel: config?.custom_label,
            options: field.options
        }
    }

    // Helper: Get all visible fields for a stage, optionally filtered by section
    const getVisibleFields = (stageId: string, section?: string): FieldConfigResult[] => {
        if (!systemFields) return []

        return systemFields
            .map(field => getFieldConfig(stageId, field.key))
            .filter((config): config is FieldConfigResult => {
                if (!config) return false
                if (!config.isVisible) return false
                if (section && config.section !== section) return false
                return true
            })
    }

    // Helper: Get header fields for a stage
    const getHeaderFields = (stageId: string): FieldConfigResult[] => {
        if (!systemFields) return []

        return systemFields
            .map(field => getFieldConfig(stageId, field.key))
            .filter((config): config is FieldConfigResult => {
                if (!config) return false
                return config.isHeader && config.isVisible
            })
    }

    // Helper: Get required fields for a stage
    const getRequiredFields = (stageId: string): FieldConfigResult[] => {
        if (!systemFields) return []

        return systemFields
            .map(field => getFieldConfig(stageId, field.key))
            .filter((config): config is FieldConfigResult => {
                if (!config) return false
                return config.isRequired && config.isVisible
            })
    }

    return {
        isLoading,
        systemFields,
        stageConfigs,
        getFieldConfig,
        getVisibleFields,
        getHeaderFields,
        getRequiredFields
    }
}
