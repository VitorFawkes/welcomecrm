import React, { useCallback } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    type NodeTypes,
    type Connection
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore } from './WorkflowStore';
import { TriggerNode } from './nodes/TriggerNode';
import { ActionNode } from './nodes/ActionNode';
import { ConditionNode } from './nodes/ConditionNode';
import { WaitNode } from './nodes/WaitNode';
import { EndNode } from './nodes/EndNode';

const nodeTypes: NodeTypes = {
    trigger: TriggerNode,
    action: ActionNode,
    condition: ConditionNode,
    wait: WaitNode,
    end: EndNode,
};

export const WorkflowCanvas: React.FC = () => {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        selectNode
    } = useWorkflowStore();

    const handleConnect = useCallback((params: Connection) => {
        onConnect(params);
    }, [onConnect]);

    const handleNodeClick = useCallback((_: React.MouseEvent, node: any) => {
        selectNode(node.id);
    }, [selectNode]);

    const handlePaneClick = useCallback(() => {
        selectNode(null);
    }, [selectNode]);

    return (
        <div className="w-full h-full bg-slate-50">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                nodeTypes={nodeTypes}
                fitView
                snapToGrid
                snapGrid={[20, 20]}
                defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: true,
                    style: { stroke: '#94a3b8', strokeWidth: 2 },
                }}
            >
                <Background color="#cbd5e1" gap={20} size={1} />
                <Controls className="bg-white border border-slate-200 shadow-sm rounded-lg" />
                <MiniMap
                    className="bg-white border border-slate-200 shadow-sm rounded-lg"
                    nodeColor={(node) => {
                        switch (node.type) {
                            case 'trigger': return '#10b981';
                            case 'action': return '#3b82f6';
                            case 'condition': return '#f59e0b';
                            case 'wait': return '#8b5cf6';
                            case 'end': return '#64748b';
                            default: return '#e2e8f0';
                        }
                    }}
                />
            </ReactFlow>
        </div>
    );
};
