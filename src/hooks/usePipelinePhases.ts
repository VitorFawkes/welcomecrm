import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PipelinePhase } from '@/types/pipeline'

export function usePipelinePhases(pipelineId?: string) {
    return useQuery({
        queryKey: ['pipeline-phases', pipelineId ?? 'all'],
        queryFn: async () => {
            if (pipelineId) {
                // Get phases that have at least one stage in this pipeline
                const { data: stagePhaseIds, error: stageErr } = await supabase
                    .from('pipeline_stages')
                    .select('phase_id')
                    .eq('pipeline_id', pipelineId)
                    .eq('ativo', true)

                if (stageErr) throw stageErr

                const phaseIds = [...new Set((stagePhaseIds || []).map(s => s.phase_id).filter((id): id is string => !!id))]
                if (phaseIds.length === 0) return []

                const { data, error } = await supabase
                    .from('pipeline_phases')
                    .select('*')
                    .eq('active', true)
                    .in('id', phaseIds)
                    .order('order_index')

                if (error) throw error
                return data as PipelinePhase[]
            }

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
