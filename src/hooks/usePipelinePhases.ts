import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PipelinePhase } from '@/types/pipeline'

export function usePipelinePhases() {
    return useQuery({
        queryKey: ['pipeline-phases'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_phases')
                .select('*')
                .eq('active', true)
                .order('order_index')

            if (error) throw error
            return data as PipelinePhase[]
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
