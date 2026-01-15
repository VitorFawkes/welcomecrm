import { MessageSquare, Server, GitBranch, Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { WhatsAppPlatformEditor } from '../../components/admin/whatsapp/WhatsAppPlatformEditor';
import { PhaseInstanceMappingTab } from '../../components/admin/integrations/PhaseInstanceMappingTab';
import { WhatsAppGovernanceTab } from '../../components/admin/whatsapp/WhatsAppGovernanceTab';

/**
 * WhatsApp Settings Page
 * 
 * Unified page for all WhatsApp configuration:
 * - Instances: Manage ChatPro/Echo API keys and URLs
 * - Phase Mapping: Which phase uses which WhatsApp instance
 * - Governance: Auto-lead creation, default pipelines, etc.
 */
export default function WhatsAppGovernance() {
    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-emerald-600" />
                    Configuração WhatsApp
                </h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie instâncias, mapeamentos e comportamento do WhatsApp.
                </p>
            </div>

            <Tabs defaultValue="instances" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="instances" className="gap-2">
                        <Server className="w-4 h-4" />
                        Instâncias
                    </TabsTrigger>
                    <TabsTrigger value="mapping" className="gap-2">
                        <GitBranch className="w-4 h-4" />
                        Mapeamento de Fases
                    </TabsTrigger>
                    <TabsTrigger value="governance" className="gap-2">
                        <Settings className="w-4 h-4" />
                        Governança
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="instances">
                    <WhatsAppPlatformEditor />
                </TabsContent>

                <TabsContent value="mapping">
                    <PhaseInstanceMappingTab />
                </TabsContent>

                <TabsContent value="governance">
                    <WhatsAppGovernanceTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}
