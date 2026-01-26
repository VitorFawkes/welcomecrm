import { create } from 'zustand';
import {
    applyNodeChanges,
    applyEdgeChanges,
    addEdge
} from '@xyflow/react';
import type {
    Node,
    Edge,
    NodeChange,
    EdgeChange,
    Connection
} from '@xyflow/react';
import type { Workflow, WorkflowNode } from '@/types/workflow.db';
import { v4 as uuidv4 } from 'uuid';

interface WorkflowBuilderState {
    // Workflow metadata
    workflowId: string | null;
    workflowName: string;
    triggerType: string;
    triggerConfig: Record<string, any>;
    isActive: boolean;
    isDirty: boolean;

    // React Flow state
    nodes: Node[];
    edges: Edge[];
    selectedNodeId: string | null;

    // Actions
    setWorkflow: (workflow: Workflow, nodes: WorkflowNode[], edges: any[]) => void;
    setNodes: (nodes: Node[]) => void;
    setEdges: (edges: Edge[]) => void;
    addNode: (type: string, position: { x: number; y: number }) => void;
    updateNodeData: (nodeId: string, data: Record<string, any>) => void;
    deleteNode: (nodeId: string) => void;
    selectNode: (nodeId: string | null) => void;
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;
    reset: () => void;
}

export const useWorkflowStore = create<WorkflowBuilderState>((set) => ({
    // Initial state
    workflowId: null,
    workflowName: 'Novo Workflow',
    triggerType: 'stage_enter',
    triggerConfig: {},
    isActive: false,
    isDirty: false,
    nodes: [],
    edges: [],
    selectedNodeId: null,

    setWorkflow: (workflow, dbNodes, dbEdges) => {
        // Convert DB nodes to React Flow nodes
        const flowNodes: Node[] = dbNodes.map(n => ({
            id: n.id,
            type: n.node_type,
            position: { x: n.position_x, y: n.position_y },
            data: {
                label: n.node_key,
                action_type: n.action_type,
                action_config: n.action_config,
                condition_config: n.condition_config,
                wait_config: n.wait_config
            }
        }));

        // Convert DB edges to React Flow edges
        const flowEdges: Edge[] = dbEdges.map(e => ({
            id: e.id,
            source: e.source_node_id,
            target: e.target_node_id,
            label: e.label,
            data: { condition: e.condition }
        }));

        set({
            workflowId: workflow.id,
            workflowName: workflow.name,
            triggerType: workflow.trigger_type,
            triggerConfig: workflow.trigger_config,
            isActive: workflow.is_active,
            nodes: flowNodes,
            edges: flowEdges,
            isDirty: false
        });
    },

    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),

    addNode: (type, position) => {
        const newNode: Node = {
            id: uuidv4(),
            type,
            position,
            data: { label: `Novo ${type}` }
        };
        set(state => ({
            nodes: [...state.nodes, newNode],
            isDirty: true
        }));
    },

    updateNodeData: (nodeId, data) => {
        set(state => ({
            nodes: state.nodes.map(node =>
                node.id === nodeId
                    ? { ...node, data: { ...node.data, ...data } }
                    : node
            ),
            isDirty: true
        }));
    },

    deleteNode: (nodeId) => {
        set(state => ({
            nodes: state.nodes.filter(n => n.id !== nodeId),
            edges: state.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
            selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
            isDirty: true
        }));
    },

    selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

    onNodesChange: (changes) => {
        set(state => ({
            nodes: applyNodeChanges(changes, state.nodes),
            isDirty: true
        }));
    },

    onEdgesChange: (changes) => {
        set(state => ({
            edges: applyEdgeChanges(changes, state.edges),
            isDirty: true
        }));
    },

    onConnect: (connection) => {
        set(state => ({
            edges: addEdge(connection, state.edges),
            isDirty: true
        }));
    },

    reset: () => set({
        workflowId: null,
        workflowName: 'Novo Workflow',
        triggerType: 'stage_enter',
        triggerConfig: {},
        isActive: false,
        isDirty: false,
        nodes: [],
        edges: [],
        selectedNodeId: null
    })
}));
