import React from 'react';
import { WorkflowNodeCard } from './WorkflowNodeCard';
import { PlayCircle, CheckSquare, ArrowRight, Bell, Edit, Clock } from 'lucide-react';
import type { NodeProps } from '@xyflow/react';

export const ActionNode: React.FC<NodeProps> = ({ data, selected }) => {
    const getIcon = () => {
        switch (data.action_type) {
            case 'create_task': return <CheckSquare className="w-4 h-4 text-blue-600" />;
            case 'move_card': return <ArrowRight className="w-4 h-4 text-blue-600" />;
            case 'notify': return <Bell className="w-4 h-4 text-blue-600" />;
            case 'update_field': return <Edit className="w-4 h-4 text-blue-600" />;
            default: return <PlayCircle className="w-4 h-4 text-blue-600" />;
        }
    };

    const getTitle = () => {
        switch (data.action_type) {
            case 'create_task': return 'Criar Tarefa';
            case 'move_card': return 'Mover Card';
            case 'notify': return 'Notificar';
            case 'update_field': return 'Atualizar Campo';
            default: return 'Ação';
        }
    };

    const config = data.action_config as any || {};

    return (
        <WorkflowNodeCard
            title={getTitle()}
            icon={getIcon()}
            colorClass="bg-blue-500"
            selected={selected}
            type="action"
        >
            <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-slate-700">
                    {config.titulo || (data.label as string) || "Nova Tarefa"}
                </span>

                {data.action_type === 'create_task' && (
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        {config.assign_to === 'card_owner' && (
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                                Dono do Card
                            </span>
                        )}
                        {config.due_minutes && (
                            <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                +{config.due_minutes}m
                            </span>
                        )}
                    </div>
                )}
            </div>
        </WorkflowNodeCard>
    );
};
