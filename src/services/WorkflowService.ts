import { supabase } from '@/lib/supabase';
import type { Workflow } from '@/types/workflow.db';

export const WorkflowService = {
    /**
     * Saves a workflow definition (workflow + nodes + edges) transactionally via RPC.
     */
    saveWorkflow: async (
        workflow: Partial<Workflow>,
        nodes: any[],
        edges: any[]
    ): Promise<string> => {
        const { data, error } = await supabase.rpc('save_workflow_definition', {
            p_workflow_id: (workflow.id || null) as unknown as string,
            p_name: workflow.name || 'Untitled Workflow',
            p_description: workflow.description || '',
            p_trigger_type: workflow.trigger_type || 'stage_enter',
            p_trigger_config: workflow.trigger_config || {},
            p_is_active: workflow.is_active || false,
            p_nodes: nodes,
            p_edges: edges
        });

        if (error) {
            console.error('Error saving workflow:', error);
            throw new Error(error.message);
        }

        return data; // Returns the workflow ID
    },

    /**
     * Fetches a workflow by ID, including nodes and edges.
     */
    getWorkflow: async (id: string) => {
        const { data: workflow, error: wfError } = await supabase
            .from('workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (wfError) throw wfError;

        const { data: nodes, error: nodesError } = await supabase
            .from('workflow_nodes')
            .select('*')
            .eq('workflow_id', id);

        if (nodesError) throw nodesError;

        const { data: edges, error: edgesError } = await supabase
            .from('workflow_edges')
            .select('*')
            .eq('workflow_id', id)
            .order('edge_order', { ascending: true });

        if (edgesError) throw edgesError;

        return { workflow, nodes, edges };
    },

    /**
     * Lists all workflows.
     */
    listWorkflows: async () => {
        const { data, error } = await supabase
            .from('workflows')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Deletes a workflow by ID.
     */
    deleteWorkflow: async (id: string) => {
        const { error } = await supabase
            .from('workflows')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    triggerTestWorkflow: async (workflowId: string, cardId: string) => {
        const { data, error } = await supabase.functions.invoke('workflow-engine', {
            body: {
                action: 'trigger_test',
                workflow_id: workflowId,
                card_id: cardId
            }
        });

        if (error) throw error;
        return data;
    },

    /**
     * Toggles the active state of a workflow.
     */
    toggleActive: async (id: string, isActive: boolean) => {
        const { error } = await supabase
            .from('workflows')
            .update({ is_active: isActive })
            .eq('id', id);

        if (error) throw error;
    }
};
