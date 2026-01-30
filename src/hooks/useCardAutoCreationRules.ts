import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export interface CardAutoCreationRule {
    id: string;
    source_pipeline_ids: string[];
    source_stage_ids: string[];
    source_owner_ids: string[] | null;
    target_pipeline_id: string;
    target_stage_id: string;
    target_owner_mode: 'same_as_source' | 'specific';
    target_owner_id: string | null;
    copy_title: boolean;
    copy_contacts: boolean;
    title_prefix: string | null;
    is_active: boolean;
    description: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
    // Relacionamentos expandidos
    target_pipeline?: { id: string; nome: string; produto: string };
    target_stage?: { id: string; nome: string };
    target_owner?: { id: string; nome: string };
}

export interface CreateRuleInput {
    source_pipeline_ids: string[];
    source_stage_ids: string[];
    source_owner_ids?: string[] | null;
    target_pipeline_id: string;
    target_stage_id: string;
    target_owner_mode?: 'same_as_source' | 'specific';
    target_owner_id?: string | null;
    copy_title?: boolean;
    copy_contacts?: boolean;
    title_prefix?: string | null;
    description?: string | null;
}

export function useCardAutoCreationRules() {
    const queryClient = useQueryClient();

    // Listar todas as regras
    const rulesQuery = useQuery({
        queryKey: ['card-auto-creation-rules'],
        queryFn: async () => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase
                .from('card_auto_creation_rules' as never) as any)
                .select(`
                    *,
                    target_pipeline:pipelines!target_pipeline_id(id, nome, produto),
                    target_stage:pipeline_stages!target_stage_id(id, nome),
                    target_owner:profiles!target_owner_id(id, nome)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as CardAutoCreationRule[];
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Criar nova regra
    const createMutation = useMutation({
        mutationFn: async (input: CreateRuleInput) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data, error } = await (supabase
                .from('card_auto_creation_rules' as never) as any)
                .insert({
                    source_pipeline_ids: input.source_pipeline_ids,
                    source_stage_ids: input.source_stage_ids,
                    source_owner_ids: input.source_owner_ids || null,
                    target_pipeline_id: input.target_pipeline_id,
                    target_stage_id: input.target_stage_id,
                    target_owner_mode: input.target_owner_mode || 'same_as_source',
                    target_owner_id: input.target_owner_id || null,
                    copy_title: input.copy_title ?? true,
                    copy_contacts: input.copy_contacts ?? true,
                    title_prefix: input.title_prefix || null,
                    description: input.description || null,
                    is_active: true,
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-auto-creation-rules'] });
            toast.success('Regra criada com sucesso!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao criar regra: ${error.message}`);
        },
    });

    // Toggle ativo/inativo
    const toggleMutation = useMutation({
        mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase
                .from('card_auto_creation_rules' as never) as any)
                .update({ is_active: isActive })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-auto-creation-rules'] });
            toast.success('Status atualizado!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao atualizar: ${error.message}`);
        },
    });

    // Deletar regra
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase
                .from('card_auto_creation_rules' as never) as any)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card-auto-creation-rules'] });
            toast.success('Regra removida!');
        },
        onError: (error: Error) => {
            toast.error(`Erro ao remover: ${error.message}`);
        },
    });

    return {
        rules: rulesQuery.data || [],
        isLoading: rulesQuery.isLoading,
        isError: rulesQuery.isError,
        error: rulesQuery.error,
        refetch: rulesQuery.refetch,
        createRule: createMutation.mutate,
        isCreating: createMutation.isPending,
        toggleRule: toggleMutation.mutate,
        isToggling: toggleMutation.isPending,
        deleteRule: deleteMutation.mutate,
        isDeleting: deleteMutation.isPending,
    };
}

// Hook auxiliar para buscar pipelines
export function usePipelines() {
    return useQuery({
        queryKey: ['pipelines'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipelines')
                .select('id, nome, produto, ativo')
                .eq('ativo', true)
                .order('nome');

            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
}
