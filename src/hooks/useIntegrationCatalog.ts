import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface CatalogItem {
    external_id: string;
    external_name: string;
    parent_external_id?: string | null;
}

export interface IntegrationCatalog {
    pipelines: CatalogItem[];
    stages: CatalogItem[];
    users: CatalogItem[];
}

interface UseIntegrationCatalogOptions {
    integrationId: string;
    pipelineId?: string;
    enabled?: boolean;
}

/**
 * Hook centralizado para dados do catálogo de integração.
 * Consolida queries duplicadas de pipelines, stages e users do ActiveCampaign.
 */
export function useIntegrationCatalog(options: UseIntegrationCatalogOptions) {
    const { integrationId, pipelineId, enabled = true } = options;

    // Fetch all pipelines
    const pipelinesQuery = useQuery({
        queryKey: ['integration-catalog', 'pipelines', integrationId],
        queryFn: async (): Promise<CatalogItem[]> => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'pipeline')
                .order('external_name');

            if (error) throw error;
            return data || [];
        },
        enabled
    });

    // Fetch stages for a specific pipeline (or all if no pipelineId)
    const stagesQuery = useQuery({
        queryKey: ['integration-catalog', 'stages', integrationId, pipelineId],
        queryFn: async (): Promise<CatalogItem[]> => {
            let query = supabase
                .from('integration_catalog')
                .select('external_id, external_name, parent_external_id')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'stage')
                .order('external_name');

            if (pipelineId) {
                query = query.eq('parent_external_id', pipelineId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled
    });

    // Fetch all users
    const usersQuery = useQuery({
        queryKey: ['integration-catalog', 'users', integrationId],
        queryFn: async (): Promise<CatalogItem[]> => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'user')
                .order('external_name');

            if (error) throw error;
            return data || [];
        },
        enabled
    });

    return {
        pipelines: pipelinesQuery.data || [],
        stages: stagesQuery.data || [],
        users: usersQuery.data || [],
        isLoading: pipelinesQuery.isLoading || stagesQuery.isLoading || usersQuery.isLoading,
        isError: pipelinesQuery.isError || stagesQuery.isError || usersQuery.isError,
        refetch: () => {
            pipelinesQuery.refetch();
            stagesQuery.refetch();
            usersQuery.refetch();
        }
    };
}

/**
 * Hook para buscar apenas pipelines.
 * Use quando não precisar de stages ou users.
 */
export function useIntegrationPipelines(integrationId: string, enabled = true) {
    return useQuery({
        queryKey: ['integration-catalog', 'pipelines', integrationId],
        queryFn: async (): Promise<CatalogItem[]> => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'pipeline')
                .order('external_name');

            if (error) throw error;
            return data || [];
        },
        enabled
    });
}

/**
 * Hook para buscar stages de um pipeline específico.
 */
export function useIntegrationStages(integrationId: string, pipelineId: string | null, enabled = true) {
    return useQuery({
        queryKey: ['integration-catalog', 'stages', integrationId, pipelineId],
        queryFn: async (): Promise<CatalogItem[]> => {
            if (!pipelineId) return [];

            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name, parent_external_id')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'stage')
                .eq('parent_external_id', pipelineId)
                .order('external_name');

            if (error) throw error;
            return data || [];
        },
        enabled: enabled && !!pipelineId
    });
}

/**
 * Hook para buscar users da integração.
 */
export function useIntegrationUsers(integrationId: string, enabled = true) {
    return useQuery({
        queryKey: ['integration-catalog', 'users', integrationId],
        queryFn: async (): Promise<CatalogItem[]> => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'user')
                .order('external_name');

            if (error) throw error;
            return data || [];
        },
        enabled
    });
}
