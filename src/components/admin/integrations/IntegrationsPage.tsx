import { useState } from 'react';
import { IntegrationList } from './IntegrationList';
import { IntegrationBuilder } from './IntegrationBuilder';
import { IntegrationFieldExplorer } from './IntegrationFieldExplorer';
import { IntegrationLogs } from './IntegrationLogs';
import { IntegrationImport } from './IntegrationImport';
import { IntegrationSettings } from './IntegrationSettings';
import { IntegrationMapping } from './IntegrationMapping';
import type { IntegrationType } from '@/lib/integrations';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Inbox, Send, Upload, Settings, GitBranch } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function IntegrationsPage() {
    const [view, setView] = useState<'list' | 'builder' | 'inspector' | 'explorer' | 'active_campaign'>('list');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [selectedType, setSelectedType] = useState<IntegrationType>('input');

    const handleSelect = (id: string | null, type?: IntegrationType) => {
        if (id === 'new') {
            setSelectedId('new');
            if (type) setSelectedType(type);
            setView('builder');
        } else if (id === 'active_campaign') {
            // Special route for System Integration
            setView('active_campaign');
        } else if (id) {
            setSelectedId(id);
            setView('builder');
        }
    };

    // --- Active Campaign Dashboard ---
    if (view === 'active_campaign') {
        return (
            <div className="h-full p-6 space-y-6 pb-20">
                <div className="flex items-center gap-4 border-b pb-4">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">ActiveCampaign (TRIPS)</h1>
                        <p className="text-muted-foreground text-sm">Gerencie a sincronização bidirecional do Pipeline 6.</p>
                    </div>
                </div>

                <Tabs defaultValue="inbox" className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="inbox" className="gap-2">
                            <Inbox className="w-4 h-4" />
                            Inbox (Entrada)
                        </TabsTrigger>
                        <TabsTrigger value="outbox" className="gap-2">
                            <Send className="w-4 h-4" />
                            Outbox (Saída)
                        </TabsTrigger>
                        <TabsTrigger value="mapping" className="gap-2">
                            <GitBranch className="w-4 h-4" />
                            Mapeamento
                        </TabsTrigger>
                        <TabsTrigger value="import" className="gap-2">
                            <Upload className="w-4 h-4" />
                            Importar / Replay
                        </TabsTrigger>
                        <TabsTrigger value="settings" className="gap-2">
                            <Settings className="w-4 h-4" />
                            Configurações
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="inbox">
                        <IntegrationLogs mode="inbox" />
                    </TabsContent>

                    <TabsContent value="outbox">
                        <IntegrationLogs mode="outbox" />
                    </TabsContent>

                    <TabsContent value="mapping">
                        <IntegrationMapping integrationId="a2141b92-561f-4514-92b4-9412a068d236" />
                    </TabsContent>

                    <TabsContent value="import">
                        <IntegrationImport />
                    </TabsContent>

                    <TabsContent value="settings">
                        <IntegrationSettings />
                    </TabsContent>
                </Tabs>
            </div>
        );
    }

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
                        <h2 className="text-lg font-semibold mb-4 text-foreground">Integrações de Sistema</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card
                                className="hover:bg-muted/50 transition-colors cursor-pointer border-blue-500/20 bg-blue-500/5"
                                onClick={() => handleSelect('active_campaign')}
                            >
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-foreground">
                                        ActiveCampaign
                                    </CardTitle>
                                    <CardDescription>
                                        Sincronização oficial (TRIPS).
                                        <br />
                                        <span className="text-xs text-blue-500">Pipeline 6 • Bidirecional</span>
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        </div>
                    </div>

                    <div className="border-t border-border pt-6">
                        <h2 className="text-lg font-semibold mb-4 text-foreground">Webhooks Genéricos</h2>
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

