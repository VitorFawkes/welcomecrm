import React from 'react';
import { cn } from '@/lib/utils';
import { Handle, Position } from '@xyflow/react';

interface WorkflowNodeCardProps {
    title: string;
    icon: React.ReactNode;
    colorClass: string;
    children?: React.ReactNode;
    selected?: boolean;
    type: 'trigger' | 'action' | 'condition' | 'wait' | 'end';
}

export const WorkflowNodeCard: React.FC<WorkflowNodeCardProps> = ({
    title,
    icon,
    colorClass,
    children,
    selected,
    type
}) => {
    return (
        <div
            className={cn(
                "w-72 bg-white rounded-xl border shadow-sm transition-all duration-200 group relative",
                selected
                    ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg scale-[1.02]"
                    : "border-slate-200 hover:border-slate-300 hover:shadow-md"
            )}
        >
            {/* Header Line */}
            <div className={cn("h-1.5 w-full rounded-t-xl", colorClass)} />

            <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                    <div className={cn(
                        "p-2 rounded-lg shadow-sm border border-white/50",
                        colorClass.replace('bg-', 'bg-opacity-10 text-')
                    )}>
                        {icon}
                    </div>
                    <span className="font-semibold text-slate-900 text-sm tracking-tight">{title}</span>
                </div>

                <div className="text-sm text-slate-600 min-h-[20px] leading-relaxed">
                    {children}
                </div>
            </div>

            {/* Handles - Improved visibility and positioning */}
            {type !== 'trigger' && (
                <Handle
                    type="target"
                    position={Position.Top}
                    className="!w-4 !h-4 !bg-slate-100 !border-4 !border-white !shadow-sm group-hover:!bg-indigo-500 transition-all -mt-2"
                />
            )}

            {type !== 'end' && (
                <Handle
                    type="source"
                    position={Position.Bottom}
                    className="!w-4 !h-4 !bg-slate-100 !border-4 !border-white !shadow-sm group-hover:!bg-indigo-500 transition-all -mb-2"
                />
            )}
        </div>
    );
};
