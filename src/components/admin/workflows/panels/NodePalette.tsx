import React from 'react';
import { useWorkflowStore } from '../WorkflowStore';
import { Button } from '@/components/ui/Button';
import { Zap, PlayCircle, Split, Clock, Flag } from 'lucide-react';

export const NodePalette: React.FC = () => {
    const { addNode } = useWorkflowStore();

    const handleAdd = (type: string) => {
        // Add to center of screen (simplified)
        // In a real app, we'd project screen center to flow coords
        addNode(type, { x: 100 + Math.random() * 50, y: 100 + Math.random() * 50 });
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur border border-slate-200 shadow-lg rounded-full p-2 flex gap-2 z-10">
            <Button variant="ghost" size="sm" onClick={() => handleAdd('trigger')} className="gap-2 text-emerald-600 hover:bg-emerald-50">
                <Zap className="w-4 h-4" /> Gatilho
            </Button>
            <div className="w-px bg-slate-200 h-6 my-auto" />
            <Button variant="ghost" size="sm" onClick={() => handleAdd('action')} className="gap-2 text-blue-600 hover:bg-blue-50">
                <PlayCircle className="w-4 h-4" /> Ação
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleAdd('condition')} className="gap-2 text-amber-600 hover:bg-amber-50">
                <Split className="w-4 h-4" /> Condição
            </Button>
            <Button variant="ghost" size="sm" onClick={() => handleAdd('wait')} className="gap-2 text-violet-600 hover:bg-violet-50">
                <Clock className="w-4 h-4" /> Esperar
            </Button>
            <div className="w-px bg-slate-200 h-6 my-auto" />
            <Button variant="ghost" size="sm" onClick={() => handleAdd('end')} className="gap-2 text-slate-600 hover:bg-slate-50">
                <Flag className="w-4 h-4" /> Fim
            </Button>
        </div>
    );
};
