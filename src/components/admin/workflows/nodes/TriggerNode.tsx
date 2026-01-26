import React from 'react';
import { WorkflowNodeCard } from './WorkflowNodeCard';
import { Zap } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export const TriggerNode: React.FC<NodeProps> = ({ data, selected }) => {
    return (
        <WorkflowNodeCard
            title="Gatilho"
            icon={<Zap className="w-4 h-4 text-emerald-600" />}
            colorClass="bg-emerald-500"
            selected={selected}
            type="trigger"
        >
            {(data.label as string) || "Quando o card entrar na etapa..."}
        </WorkflowNodeCard>
    );
};
