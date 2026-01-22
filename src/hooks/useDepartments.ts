import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Department {
    id: string;
    name: string;
    description?: string | null;
}

export function useDepartments() {
    const departmentsQuery = useQuery({
        queryKey: ['departments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('name');

            if (error) throw error;
            return data as Department[];
        },
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    return {
        departments: departmentsQuery.data || [],
        isLoading: departmentsQuery.isLoading,
        isError: departmentsQuery.isError,
        error: departmentsQuery.error,
    };
}
