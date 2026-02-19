import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

/**
 * Retorna a fase do pipeline associada ao time do usuário logado.
 * Cadeia: profile.team_id → teams.phase_id → pipeline_phases
 */
export function useMyTeamPhase() {
    const { profile } = useAuth()

    return useQuery({
        queryKey: ['my-team-phase', profile?.team_id],
        enabled: !!profile?.team_id,
        queryFn: async () => {
            if (!profile?.team_id) return null
            const { data, error } = await supabase
                .from('teams')
                .select('phase:pipeline_phases(id, name, slug, color, order_index)')
                .eq('id', profile.team_id)
                .single()

            if (error) throw error
            return data?.phase ?? null
        },
        staleTime: 10 * 60 * 1000 // 10 minutes
    })
}
