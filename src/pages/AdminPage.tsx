import { useState } from 'react';
import {
    Database,
    Kanban,
    Users,
    Tags,
    Activity,
    LayoutDashboard
} from 'lucide-react';
import { cn } from '@/lib/utils';
import StudioUnified from '../components/admin/studio/StudioUnified';
import PipelineStudio from './admin/PipelineStudio';
import UserManagement from './admin/UserManagement';
import CategoryManagement from './admin/CategoryManagement';
import CRMHealth from './admin/CRMHealth';

type AdminTab = 'governance' | 'pipeline' | 'users' | 'categories' | 'health';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<AdminTab>('governance');

    const tabs = [
        { id: 'governance', label: 'Governança de Dados', icon: Database, component: StudioUnified },
        { id: 'pipeline', label: 'Pipeline de Vendas', icon: Kanban, component: PipelineStudio },
        { id: 'users', label: 'Gestão de Usuários', icon: Users, component: UserManagement },
        { id: 'categories', label: 'Categorias & Motivos', icon: Tags, component: CategoryManagement },
        { id: 'health', label: 'Saúde do Sistema', icon: Activity, component: CRMHealth },
    ];

    const ActiveComponent = tabs.find(t => t.id === activeTab)?.component || StudioUnified;

    return (
        <div className="flex flex-col h-full">
            {/* Admin Navigation Tabs */}
            <div className="bg-white border-b border-gray-200 px-8 pt-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-900 rounded-lg">
                        <LayoutDashboard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Administração</h1>
                        <p className="text-sm text-gray-500">Central de controle e configuração do sistema.</p>
                    </div>
                </div>

                <div className="flex gap-6 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as AdminTab)}
                                className={cn(
                                    "flex items-center gap-2 pb-4 text-sm font-medium transition-all border-b-2 whitespace-nowrap",
                                    isActive
                                        ? "border-indigo-600 text-indigo-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                )}
                            >
                                <Icon className={cn("w-4 h-4", isActive ? "text-indigo-600" : "text-gray-400")} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto bg-gray-50/50">
                <ActiveComponent />
            </div>
        </div>
    );
}
