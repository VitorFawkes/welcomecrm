import { useState } from 'react';

import { IntegrationList } from './IntegrationList';
import { IntegrationBuilder } from './IntegrationBuilder';
import { IntegrationFieldExplorer } from './IntegrationFieldExplorer';
import { IntegrationLogs } from './IntegrationLogs';
import { IntegrationSettings } from './IntegrationSettings';
import { IntegrationMapping } from './IntegrationMapping';
import { SyncGovernancePanel } from './SyncGovernancePanel';
import { IntegrationStatusDashboard } from './IntegrationStatusDashboard';
import { InboundFieldMappingTab } from './InboundFieldMappingTab';
import { OutboundFieldMappingTab } from './OutboundFieldMappingTab';
import { ACFieldManager } from './ACFieldManager';
import { CardAutoCreationTab } from './CardAutoCreationTab';

import type { IntegrationType } from '@/lib/integrations';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft,
    LayoutDashboard,
    GitBranch,
    FileText,
    Settings,
    Zap,
    Copy
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const AC_INTEGRATION_ID = 'a2141b92-561f-4514-92b4-9412a068d236';

export function IntegrationsPage() {
    const [view, setView] = useState<'list' | 'builder' | 'inspector' | 'explorer' | 'active_campaign' | 'auto_card_creation' | 'api_keys' | 'api_docs'>('list');

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<IntegrationType>('input');

    const handleSelect = (id: string | null, type?: IntegrationType) => {
        if (id === 'new') {
            setSelectedId('new');
            if (type) setSelectedType(type);
            setView('builder');
        } else if (id === 'active_campaign') {
            setView('active_campaign');
        } else if (id === 'auto_card_creation') {
            setView('auto_card_creation');
        } else if (id) {
            setSelectedId(id);
            setView('builder');
        }
    };

    // --- Auto Card Creation View ---
    if (view === 'auto_card_creation') {
        return (
            <div className="h-full p-6 space-y-6 pb-20 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Criação Automática de Cards
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Configure regras para criar cards automaticamente quando um card entrar em determinada etapa.
                        </p>
                    </div>
                </div>

                {/* Content */}
                <CardAutoCreationTab />
            </div>
        );
    }

    // --- Active Campaign Dashboard (Redesigned) ---
    if (view === 'active_campaign') {
        return (
            <div className="h-full p-6 space-y-6 pb-20 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            ActiveCampaign Integration
                        </h1>
                        <p className="text-slate-500 text-sm">
                            Gerencie a sincronização bidirecional de deals em uma única central de controle.
                        </p>
                    </div>
                    <IntegrationStatusDashboard />
                </div>

                {/* Main Tabs - Consolidated to 4 */}
                <Tabs defaultValue="sync" className="space-y-6">
                    <TabsList className="bg-slate-100 p-1 rounded-lg">
                        <TabsTrigger
                            value="sync"
                            className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2"
                        >
                            <Zap className="w-4 h-4" />
                            Sincronização
                        </TabsTrigger>
                        <TabsTrigger
                            value="mapping"
                            className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2"
                        >
                            <GitBranch className="w-4 h-4" />
                            Mapeamento
                        </TabsTrigger>
                        <TabsTrigger
                            value="fields"
                            className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2"
                        >
                            <FileText className="w-4 h-4" />
                            Campos
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2"
                        >
                            <Settings className="w-4 h-4" />
                            Configurações
                        </TabsTrigger>
                    </TabsList>

                    {/* Tab 1: Sync (Governance) */}
                    <TabsContent value="sync" className="space-y-6">
                        <SyncGovernancePanel />

                        {/* Recent Activity - Optional, can be removed or kept as separate view */}
                        <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <LayoutDashboard className="w-4 h-4 text-slate-400" />
                                    Eventos Recentes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <IntegrationLogs mode="inbox" />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Tab 2: Mapping */}
                    <TabsContent value="mapping">
                        <IntegrationMapping integrationId={AC_INTEGRATION_ID} />
                    </TabsContent>

                    {/* Tab 3: Fields */}
                    <TabsContent value="fields" className="space-y-6">
                        <Tabs defaultValue="inbound" className="space-y-4">
                            <TabsList className="bg-slate-50">
                                <TabsTrigger value="inbound" className="text-sm">
                                    Campos de Entrada (AC → Welcome)
                                </TabsTrigger>
                                <TabsTrigger value="outbound" className="text-sm">
                                    Campos de Saída (Welcome → AC)
                                </TabsTrigger>
                                <TabsTrigger value="ac-fields" className="text-sm">
                                    Catálogo AC
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="inbound">
                                <InboundFieldMappingTab integrationId={AC_INTEGRATION_ID} />
                            </TabsContent>

                            <TabsContent value="outbound">
                                <OutboundFieldMappingTab integrationId={AC_INTEGRATION_ID} />
                            </TabsContent>

                            <TabsContent value="ac-fields">
                                <ACFieldManager integrationId={AC_INTEGRATION_ID} />
                            </TabsContent>
                        </Tabs>
                    </TabsContent>

                    {/* Tab 4: Settings */}
                    <TabsContent value="settings">
                        <IntegrationSettings />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

    // --- Main List View ---
    return (
        <div className="h-full p-6 space-y-6">
            {view === 'builder' && selectedId ? (
                <IntegrationBuilder
                    integrationId={selectedId}
                    initialType={selectedType}
                    onBack={() => {
                        setView('list');
                        setSelectedId(null);
                    }}
                    onDraftCreated={(newId) => {
                        setSelectedId(newId);
                    }}
                />
            ) : view === 'explorer' ? (
                <IntegrationFieldExplorer onBack={() => setView('list')} />
            ) : (
                <div className="space-y-6">
                    {/* System Integrations Section */}
                    <div>
                        <h2 className="text-lg font-semibold mb-4 text-slate-900">Integrações de Sistema</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card
                                className="hover:bg-blue-50/50 transition-all duration-200 cursor-pointer border-blue-200/50 bg-gradient-to-br from-white to-blue-50/30 shadow-sm hover:shadow-md"
                                onClick={() => handleSelect('active_campaign')}
                            >
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                                            <Zap className="w-4 h-4 text-white" />
                                        </div>
                                        ActiveCampaign
                                    </CardTitle>
                                    <CardDescription className="text-slate-500">
                                        Sincronização oficial de Deals e Contatos.
                                        <br />
                                        <span className="text-xs text-blue-600 font-medium">Pipeline TRIPS • Bidirecional</span>
                                    </CardDescription>
                                </CardHeader>
                            </Card>

                            <Card
                                className="hover:bg-purple-50/50 transition-all duration-200 cursor-pointer border-purple-200/50 bg-gradient-to-br from-white to-purple-50/30 shadow-sm hover:shadow-md"
                                onClick={() => handleSelect('auto_card_creation')}
                            >
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-slate-900">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                                            <Copy className="w-4 h-4 text-white" />
                                        </div>
                                        Criação Automática de Cards
                                    </CardTitle>
                                    <CardDescription className="text-slate-500">
                                        Crie cards automaticamente quando outro card entra em uma etapa.
                                        <br />
                                        <span className="text-xs text-purple-600 font-medium">Automação Interna • Multi-pipeline</span>
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-900">Webhooks Genéricos</h2>
                        <IntegrationList
                            onSelect={handleSelect}
                            onExploreFields={() => setView('explorer')}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
