import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PipelineStage } from '@/types/pipeline'

export function usePipelineStages() {
    return useQuery({
        queryKey: ['pipeline-stages'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('*')
                .order('ordem')

            if (error) throw error
            return data as unknown as PipelineStage[]
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    })
}
