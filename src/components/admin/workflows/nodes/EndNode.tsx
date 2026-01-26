import React from 'react';
import { WorkflowNodeCard } from './WorkflowNodeCard';
import { Flag } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export const EndNode: React.FC<NodeProps> = ({ data, selected }) => {
    return (
        <WorkflowNodeCard
            title="Fim"
            icon={<Flag className="w-4 h-4 text-slate-600" />}
            colorClass="bg-slate-500"
            selected={selected}
            type="end"
        >
            {(data.label as string) || "Finalizar workflow"}
        </WorkflowNodeCard>
    );
};
