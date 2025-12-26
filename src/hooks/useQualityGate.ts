import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'




export function useQualityGate() {
    const { data: rules } = useQuery({
        queryKey: ['stage-field-config'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stage_field_config')
                .select(`
                    *,
                    system_fields (
                        label
                    )
                `)
                .eq('required', true)

            if (error) throw error

            // Map to expected format
            return data?.map((item: any) => ({
                stage_id: item.stage_id,
                field_key: item.field_key,
                label: item.system_fields?.label || item.field_key,
                required: item.required
            })) || []
        },
        staleTime: 1000 * 60 * 5 // 5 minutes
    })

    const validateMove = (card: any, targetStageId: string) => {
        if (!rules) return { valid: true, missingFields: [] }

        const stageRules = rules.filter(r => r.stage_id === targetStageId)
        const missingFields: { key: string, label: string }[] = []

        for (const rule of stageRules) {
            const value = card[rule.field_key]

            // Check if value is empty/null/undefined
            // For arrays (like destinations), check length
            // For objects (like budget), check if it has keys? Maybe just check if not null for now.

            let isValid = true

            if (value === null || value === undefined || value === '') {
                isValid = false
            } else if (Array.isArray(value) && value.length === 0) {
                isValid = false
            } else if (typeof value === 'object' && Object.keys(value).length === 0) {
                isValid = false
            }

            // Special handling for nested fields if needed (e.g. produto_data->destinos)
            // But currently the card object from Kanban might be flat or have produto_data.
            // The AVAILABLE_FIELDS in the new Pipeline Studio have IDs like 'destinos', 'orcamento'.
            // These are usually inside 'produto_data' in the DB, but maybe flattened in the view?
            // Let's check view_cards_acoes definition again.
            // 'destinos' comes from c.produto_data -> 'destinos'.
            // 'orcamento' comes from c.produto_data -> 'orcamento'.
            // So in the view, they are top-level columns.
            // So checking card[rule.field_key] should work if card comes from the view.

            if (!isValid) {
                missingFields.push({ key: rule.field_key, label: rule.label })
            }
        }

        return {
            valid: missingFields.length === 0,
            missingFields
        }
    }

    return { validateMove }
}
