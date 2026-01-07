import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Webhook, Activity, ArrowRight, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface Integration {
    id: string;
    name: string;
    type: 'input' | 'output';
    provider: string;
    is_active: boolean;
}

interface ProviderDef {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    type: 'input' | 'output';
    category: 'Marketing' | 'Finance' | 'Developer' | 'Communication';
}

const PROVIDERS: ProviderDef[] = [
    {
        id: 'webhook-in',
        name: 'Receber Dados (Webhook)',
        description: 'Crie uma URL única para receber dados de qualquer ferramenta externa (Typeform, WordPress, etc) e criar registros no CRM.',
        icon: Webhook,
        type: 'input',
        category: 'Developer'
    },
    {
        id: 'webhook-out',
        name: 'Enviar Dados (Disparo)',
        description: 'Envie dados do CRM para outras ferramentas quando eventos acontecerem (ex: Negócio Ganho -> Slack/Zapier).',
        icon: Zap,
        type: 'output',
        category: 'Developer'
    }
];

export function IntegrationList({ onSelect }: { onSelect: (id: string | null, type?: 'input' | 'output') => void }) {
    const { data: integrations, isLoading } = useQuery({
        queryKey: ['integrations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integrations' as any)
                .select('*')
                .not('name', 'ilike', '%(Rascunho)%')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as unknown as Integration[];
        },
    });

    if (isLoading) {
        return (
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full bg-white/5" />
                ))}
            </div>
        );
    }

    const activeIntegrations = integrations || [];

    return (
        <div className="space-y-10">
            {/* Header Section */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-foreground tracking-tight">Integrations Hub</h2>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Conecte suas ferramentas favoritas e automatize seu fluxo de trabalho.
                    </p>
                </div>
            </div>

            {/* Active Integrations Section */}
            {activeIntegrations.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Suas Conexões Ativas
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeIntegrations.map((integration) => (
                            <Card
                                key={integration.id}
                                className="bg-card hover:border-primary/50 transition-all cursor-pointer group shadow-sm border-l-4 border-l-primary"
                                onClick={() => onSelect(integration.id)}
                            >
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            {integration.type === 'input' ? (
                                                <Webhook className="h-5 w-5 text-primary" />
                                            ) : (
                                                <Activity className="h-5 w-5 text-primary" />
                                            )}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-medium text-foreground">
                                                {integration.name}
                                            </CardTitle>
                                            <p className="text-xs text-muted-foreground capitalize">
                                                {integration.provider}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant={integration.is_active ? 'default' : 'secondary'} className="text-[10px]">
                                        {integration.is_active ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-muted-foreground">Última sincronização: Hoje, 10:42</span>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}

            {/* Catalog Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                    <h3 className="text-xl font-semibold text-foreground">Catálogo de Apps</h3>
                    <div className="flex gap-2">
                        {['Todos', 'Marketing', 'Finance', 'Developer'].map((cat) => (
                            <Button key={cat} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                {cat}
                            </Button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {PROVIDERS.map((provider) => (
                        <Card
                            key={provider.id}
                            className="group hover:shadow-lg transition-all duration-300 border-border/50 bg-gradient-to-br from-card to-card/50 hover:from-card hover:to-primary/5"
                        >
                            <CardHeader>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="p-3 bg-background rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-300">
                                        <provider.icon className="w-8 h-8 text-foreground" />
                                    </div>
                                    <Badge variant="outline" className="text-xs font-normal">
                                        {provider.category}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {provider.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 h-10">
                                    {provider.description}
                                </CardDescription>
                            </CardHeader>
                            <CardFooter>
                                <Button
                                    className="w-full bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                                    onClick={() => onSelect('new', provider.type)}
                                >
                                    Conectar
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
