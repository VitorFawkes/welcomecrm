import React from 'react';
import { WorkflowNodeCard } from './WorkflowNodeCard';
import { Clock, Briefcase, ShieldAlert } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

// ...

export const WaitNode: React.FC<NodeProps> = ({ data, selected }) => {
    const config = data.wait_config as any || {};
    const minutes = config.minutes || 0;

    const formatDuration = (mins: number) => {
        if (mins >= 1440) return `${Math.round(mins / 1440)} dias`;
        if (mins >= 60) return `${Math.round(mins / 60)} horas`;
        return `${mins} min`;
    };

    return (
        <WorkflowNodeCard
            title="Aguardar"
            icon={<Clock className="w-4 h-4 text-violet-600" />}
            colorClass="bg-violet-500"
            selected={selected}
            type="wait"
        >
            <div className="flex flex-col gap-2">
                <span className="text-lg font-bold text-slate-800">
                    {formatDuration(minutes)}
                </span>

                <div className="flex items-center gap-2">
                    {config.respect_business_hours && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title="Respeita Horário Comercial">
                            <Briefcase className="w-3 h-3" />
                            <span>Úteis</span>
                        </div>
                    )}
                    {config.stop_if_stage_changed && (
                        <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200" title="Para se mudar de etapa">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Guard</span>
                        </div>
                    )}
                </div>
            </div>
        </WorkflowNodeCard>
    );
};
