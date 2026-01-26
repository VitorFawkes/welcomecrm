import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Play, GitBranch, Zap, Clock, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { WorkflowService } from '@/services/WorkflowService';
import type { Workflow } from '@/types/workflow.db';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const WorkflowListPage: React.FC = () => {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchWorkflows = async () => {
        try {
            setLoading(true);
            const data = await WorkflowService.listWorkflows();
            setWorkflows(data as unknown as Workflow[]);
        } catch (error) {
            console.error('Error fetching workflows:', error);
            toast.error('Erro ao carregar workflows.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este workflow?')) return;

        try {
            await WorkflowService.deleteWorkflow(id);
            toast.success('Workflow excluído com sucesso.');
            fetchWorkflows();
        } catch (error) {
            console.error('Error deleting workflow:', error);
            toast.error('Erro ao excluir workflow.');
        }
    };

    const handleToggleActive = async (id: string, currentState: boolean) => {
        try {
            // Optimistic update
            setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: !currentState } : w));

            await WorkflowService.toggleActive(id, !currentState);
            toast.success(`Workflow ${!currentState ? 'ativado' : 'desativado'}.`);
        } catch (error) {
            console.error('Error toggling workflow:', error);
            toast.error('Erro ao atualizar status.');
            // Revert on error
            setWorkflows(prev => prev.map(w => w.id === id ? { ...w, is_active: currentState } : w));
        }
    };

    const getTriggerIcon = (type: string) => {
        switch (type) {
            case 'stage_enter': return <GitBranch className="w-3 h-3" />;
            case 'schedule': return <Clock className="w-3 h-3" />;
            default: return <Zap className="w-3 h-3" />;
        }
    };

    const getTriggerLabel = (type: string) => {
        switch (type) {
            case 'stage_enter': return 'Mudança de Etapa';
            case 'schedule': return 'Agendamento';
            case 'webhook': return 'Webhook';
            default: return type;
        }
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header */}
            <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Automações</h1>
                    <p className="text-sm text-slate-500 mt-1">Gerencie fluxos de trabalho e regras de negócio.</p>
                </div>
                <Button
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-200 transition-all hover:scale-105"
                    onClick={() => navigate('/settings/workflows/builder')}
                >
                    <Plus className="w-4 h-4" /> Novo Workflow
                </Button>
            </header>

            {/* Content */}
            <div className="flex-1 p-8 overflow-auto">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : workflows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed m-4 shadow-sm">
                        <div className="bg-indigo-50 p-6 rounded-full mb-6 ring-8 ring-indigo-50/50">
                            <GitBranch className="w-12 h-12 text-indigo-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-2">Crie seu primeiro Workflow</h3>
                        <p className="mb-8 text-center max-w-md text-slate-600">
                            Automatize tarefas repetitivas, envie e-mails automáticos e mova cards entre etapas com base em gatilhos inteligentes.
                        </p>
                        <Button
                            size="lg"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-200"
                            onClick={() => navigate('/settings/workflows/builder')}
                        >
                            <Plus className="w-5 h-5" /> Criar Automação
                        </Button>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-900/5">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="hover:bg-transparent border-slate-200">
                                    <TableHead className="w-[400px] pl-6">Workflow</TableHead>
                                    <TableHead>Gatilho</TableHead>
                                    <TableHead>Execuções</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right pr-6">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {workflows.map((workflow) => (
                                    <TableRow key={workflow.id} className="group hover:bg-slate-50/50 transition-colors border-slate-100">
                                        <TableCell className="pl-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-semibold text-slate-900 text-base">{workflow.name}</span>
                                                {workflow.description && (
                                                    <span className="text-sm text-slate-500 line-clamp-1 max-w-md">
                                                        {workflow.description}
                                                    </span>
                                                )}
                                                <span className="text-xs text-slate-400 mt-1">
                                                    Criado em {format(new Date(workflow.created_at), "d 'de' MMM, yyyy", { locale: ptBR })}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                                                {getTriggerIcon(workflow.trigger_type)}
                                                {getTriggerLabel(workflow.trigger_type)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-slate-600 text-sm">
                                                <span className="font-medium">0</span>
                                                <span className="text-slate-400 text-xs">(últimos 30 dias)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Switch
                                                    checked={workflow.is_active}
                                                    onCheckedChange={() => handleToggleActive(workflow.id, workflow.is_active)}
                                                />
                                                <span className={`text-xs font-medium ${workflow.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {workflow.is_active ? 'Ativo' : 'Pausado'}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-6">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                                                    onClick={() => navigate(`/settings/workflows/builder/${workflow.id}`)}
                                                    title="Editar"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40">
                                                        <DropdownMenuItem onClick={() => navigate(`/settings/workflows/builder/${workflow.id}`)}>
                                                            <Play className="w-4 h-4 mr-2" /> Testar
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(workflow.id)}>
                                                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkflowListPage;
