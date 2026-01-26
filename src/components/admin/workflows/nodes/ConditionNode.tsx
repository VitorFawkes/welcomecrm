import React from 'react';
import { WorkflowNodeCard } from './WorkflowNodeCard';
import { Split } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export const ConditionNode: React.FC<NodeProps> = ({ data, selected }) => {
    return (
        <WorkflowNodeCard
            title="Condição"
            icon={<Split className="w-4 h-4 text-amber-600" />}
            colorClass="bg-amber-500"
            selected={selected}
            type="condition"
        >
            {(data.label as string) || "Verificar condição..."}
        </WorkflowNodeCard>
    );
};
