import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Pipeline {
    id: string
    nome: string
    produto: string
    ativo: boolean | null
}

export function usePipelines() {
    return useQuery({
        queryKey: ['pipelines'],
        queryFn: async (): Promise<Pipeline[]> => {
            const { data, error } = await supabase
                .from('pipelines')
                .select('id, nome, produto, ativo')
                .eq('ativo', true)
                .order('nome')

            if (error) throw error
            return data || []
        },
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes
        refetchOnWindowFocus: false
    })
}
