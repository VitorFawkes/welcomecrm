import React, { useEffect, useState } from 'react';
import { useWorkflowStore } from '../WorkflowStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { X, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const NodeInspector: React.FC = () => {
    const { selectedNodeId, nodes, updateNodeData, selectNode } = useWorkflowStore();
    const [users, setUsers] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);

    const selectedNode = nodes.find(n => n.id === selectedNodeId);

    useEffect(() => {
        const fetchData = async () => {
            // Fetch users (profiles)
            const { data: profiles } = await supabase.from('profiles').select('id, name, email');
            if (profiles) setUsers(profiles);

            // Fetch stages
            const { data: pipelineStages } = await supabase.from('pipeline_stages').select('id, name').order('position');
            if (pipelineStages) setStages(pipelineStages);
        };
        fetchData();
    }, []);

    if (!selectedNode) {
        return (
            <div className="w-80 h-full border-l border-slate-200 bg-white p-6 flex flex-col items-center justify-center text-center">
                <p className="text-slate-500 text-sm">Selecione um item no canvas para editar suas propriedades.</p>
            </div>
        );
    }

    const handleChange = (key: string, value: any) => {
        // If key starts with 'config.', update nested config object
        if (key.startsWith('config.')) {
            const configKey = key.split('.')[1];
            const configType = `${selectedNode.type}_config` as string; // e.g. action_config

            // Handle legacy or new structure
            const currentConfig = selectedNode.data[configType] || {};

            updateNodeData(selectedNode.id, {
                [configType]: {
                    ...currentConfig,
                    [configKey]: value
                }
            });
        } else {
            updateNodeData(selectedNode.id, { [key]: value });
        }
    };

    return (
        <div className="w-96 h-full border-l border-slate-200 bg-white flex flex-col shadow-xl z-20">
            <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-slate-50/50 backdrop-blur-sm">
                <span className="font-semibold text-slate-900">Propriedades</span>
                <Button variant="ghost" size="icon" onClick={() => selectNode(null)}>
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* Common Fields */}
                <div className="space-y-3">
                    <Label>Rótulo do Passo</Label>
                    <Input
                        value={selectedNode.data.label as string || ''}
                        onChange={(e) => handleChange('label', e.target.value)}
                        placeholder="Ex: Enviar Email de Boas-vindas"
                        className="font-medium"
                    />
                </div>

                {/* Action Specific */}
                {selectedNode.type === 'action' && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label>Tipo de Ação</Label>
                            <Select
                                value={selectedNode.data.action_type as string}
                                onChange={(v) => handleChange('action_type', v)}
                                options={[
                                    { value: 'create_task', label: 'Criar Tarefa' },
                                    { value: 'move_card', label: 'Mover Card' },
                                    { value: 'notify', label: 'Notificar' },
                                    { value: 'update_field', label: 'Atualizar Campo' }
                                ]}
                                placeholder="Selecione..."
                            />
                        </div>

                        {selectedNode.data.action_type === 'create_task' && (
                            <div className="space-y-5 border-t border-slate-100 pt-5">
                                <div className="space-y-3">
                                    <Label>Título da Tarefa</Label>
                                    <Input
                                        value={(selectedNode.data.action_config as any)?.titulo || ''}
                                        onChange={(e) => handleChange('config.titulo', e.target.value)}
                                        placeholder="Ex: Ligar para cliente"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-3">
                                        <Label>Tipo</Label>
                                        <Select
                                            value={(selectedNode.data.action_config as any)?.tipo || 'tarefa'}
                                            onChange={(v) => handleChange('config.tipo', v)}
                                            options={[
                                                { value: 'tarefa', label: 'Tarefa' },
                                                { value: 'ligacao', label: 'Ligação' },
                                                { value: 'whatsapp', label: 'WhatsApp' },
                                                { value: 'email', label: 'Email' },
                                                { value: 'reuniao', label: 'Reunião' }
                                            ]}
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label>Prioridade</Label>
                                        <Select
                                            value={(selectedNode.data.action_config as any)?.prioridade || 'media'}
                                            onChange={(v) => handleChange('config.prioridade', v)}
                                            options={[
                                                { value: 'alta', label: 'Alta' },
                                                { value: 'media', label: 'Média' },
                                                { value: 'baixa', label: 'Baixa' }
                                            ]}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label>Responsável</Label>
                                    <Select
                                        value={(selectedNode.data.action_config as any)?.assign_to || 'card_owner'}
                                        onChange={(v) => handleChange('config.assign_to', v)}
                                        options={[
                                            { value: 'card_owner', label: 'Dono do Card' },
                                            { value: 'role:sdr', label: 'Qualquer SDR (Round Robin)' },
                                            { value: 'role:vendas', label: 'Planner (Vendas)' },
                                            { value: 'role:pos_venda', label: 'Pós-Venda' },
                                            ...users.map(u => ({ value: u.id, label: u.name || u.email }))
                                        ]}
                                    />
                                </div>

                                <div className="space-y-3">
                                    <Label>Vencimento (minutos)</Label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            value={(selectedNode.data.action_config as any)?.due_minutes || 60}
                                            onChange={(e) => handleChange('config.due_minutes', parseInt(e.target.value))}
                                            className="pl-9"
                                        />
                                        <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    </div>
                                    <p className="text-xs text-slate-500">Tempo após a criação para vencer.</p>
                                </div>
                            </div>
                        )}

                        {selectedNode.data.action_type === 'move_card' && (
                            <div className="space-y-3 border-t border-slate-100 pt-5">
                                <Label>Mover para Etapa</Label>
                                <Select
                                    value={(selectedNode.data.action_config as any)?.stage_id || ''}
                                    onChange={(v) => handleChange('config.stage_id', v)}
                                    options={stages.map(s => ({ value: s.id, label: s.name }))}
                                    placeholder="Selecione a etapa..."
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Wait Specific */}
                {selectedNode.type === 'wait' && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <Label>Tempo de Espera (minutos)</Label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    value={(selectedNode.data.wait_config as any)?.minutes || 0}
                                    onChange={(e) => handleChange('config.minutes', parseInt(e.target.value))}
                                    className="pl-9"
                                />
                                <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            </div>
                            <div className="flex gap-2 mt-2">
                                {[60, 1440, 2880].map(m => (
                                    <button
                                        key={m}
                                        onClick={() => handleChange('config.minutes', m)}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-600 transition-colors"
                                    >
                                        {m === 60 ? '1h' : m === 1440 ? '1d' : '2d'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4 border-t border-slate-100 pt-5">
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base">Horário Comercial</Label>
                                    <p className="text-xs text-slate-500">Pausar contagem fora do expediente</p>
                                </div>
                                <Switch
                                    checked={(selectedNode.data.wait_config as any)?.respect_business_hours || false}
                                    onCheckedChange={(c) => handleChange('config.respect_business_hours', c)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label className="text-base text-amber-700">Guard de Etapa</Label>
                                    <p className="text-xs text-slate-500">Parar se o card mudar de etapa</p>
                                </div>
                                <Switch
                                    checked={(selectedNode.data.wait_config as any)?.stop_if_stage_changed || false}
                                    onCheckedChange={(c) => handleChange('config.stop_if_stage_changed', c)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
