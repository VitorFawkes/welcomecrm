import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Search, Copy, Database, Layers, Code, BookOpen, Printer } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CORE_FIELDS, SECTIONS_MAP, type DocField } from '@/lib/integration-docs';

interface SystemField {
    id: string;
    key: string;
    label: string;
    type: string;
    section: string;
    active: boolean;
    options?: any;
}

export function IntegrationFieldExplorer({ onBack }: { onBack: () => void }) {
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'explorer' | 'docs'>('explorer');

    const { data: systemFields, isLoading } = useQuery({
        queryKey: ['system-fields-explorer'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_fields' as any)
                .select('*')
                .order('section')
                .order('label');

            if (error) throw error;
            return data as unknown as SystemField[];
        }
    });

    // Merge Core Fields + System Fields
    const allFields = useMemo(() => {
        const dynamicFields: DocField[] = (systemFields || []).map(f => ({
            key: f.key,
            label: f.label,
            type: f.type,
            section: f.section,
            description: `Campo personalizado do sistema (${f.section}).`,
            example: f.options ? `Um dos valores: ${JSON.stringify(f.options).slice(0, 20)}...` : 'Texto livre',
            required: false
        }));
        return [...CORE_FIELDS, ...dynamicFields];
    }, [systemFields]);

    // Group fields by section
    const groupedFields = useMemo(() => {
        return allFields.reduce((acc, field) => {
            const sectionName = SECTIONS_MAP[field.section] || field.section;
            if (!acc[sectionName]) acc[sectionName] = [];
            acc[sectionName].push(field);
            return acc;
        }, {} as Record<string, DocField[]>);
    }, [allFields]);

    const filteredSections = useMemo(() => {
        return Object.entries(groupedFields).reduce((acc, [section, sectionFields]) => {
            const filtered = sectionFields.filter(f =>
                f.label.toLowerCase().includes(search.toLowerCase()) ||
                f.key.toLowerCase().includes(search.toLowerCase()) ||
                section.toLowerCase().includes(search.toLowerCase())
            );
            if (filtered.length > 0) {
                acc[section] = filtered;
            }
            return acc;
        }, {} as Record<string, DocField[]>);
    }, [groupedFields, search]);

    const { data: kanbanStages } = useQuery({
        queryKey: ['kanban-stages-docs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('pipeline_stages')
                .select('id, nome, pipeline_id')
                .eq('ativo', true)
                .order('ordem');

            if (error) throw error;
            return data as { id: string, nome: string, pipeline_id: string }[];
        }
    });

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Código copiado!');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2 text-gray-900">
                        <Database className="w-6 h-6 text-primary" />
                        Central de Integração
                    </h2>
                    <p className="text-muted-foreground">
                        Documentação completa e referência de campos para desenvolvedores.
                    </p>
                </div>
                <div className="flex gap-2">
                    {activeTab === 'docs' && (
                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" />
                            Imprimir / PDF
                        </Button>
                    )}
                    <Button variant="outline" onClick={onBack}>
                        Voltar
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-4 print:hidden">
                    <TabsList>
                        <TabsTrigger value="explorer" className="gap-2">
                            <Search className="w-4 h-4" />
                            Explorador Rápido
                        </TabsTrigger>
                        <TabsTrigger value="docs" className="gap-2">
                            <BookOpen className="w-4 h-4" />
                            Documentação Técnica
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === 'explorer' && (
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar campos..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-9 bg-white border-gray-200"
                            />
                        </div>
                    )}
                </div>

                {/* --- EXPLORER TAB --- */}
                <TabsContent value="explorer" className="flex-1 min-h-0">
                    <ScrollArea className="h-full pr-4">
                        {isLoading ? (
                            <div className="text-center py-10 text-muted-foreground">Carregando campos...</div>
                        ) : (
                            <div className="space-y-8 pb-10">
                                {Object.entries(filteredSections).map(([section, sectionFields]) => (
                                    <div key={section} className="space-y-3">
                                        <div className="flex items-center gap-2 pb-2 border-b border-gray-200 sticky top-0 bg-gray-50/95 backdrop-blur z-10 py-2">
                                            <Layers className="w-4 h-4 text-primary" />
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {section}
                                            </h3>
                                            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                                                {sectionFields.length}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {sectionFields.map((field) => (
                                                <Card key={field.key} className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-all group">
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <h4 className="font-medium text-sm text-gray-900">{field.label}</h4>
                                                                <div className="flex items-center gap-1 mt-1">
                                                                    <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-indigo-600 font-mono border border-gray-200">
                                                                        {field.key}
                                                                    </code>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-600"
                                                                        onClick={() => copyToClipboard(field.key)}
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline" className="text-[10px] h-5 border-gray-200 text-gray-500">
                                                                {field.type}
                                                            </Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>

                {/* --- DOCS TAB --- */}
                <TabsContent value="docs" className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    <ScrollArea className="h-full">
                        <div className="p-8 max-w-4xl mx-auto space-y-10 print:p-0 print:shadow-none print:border-none">

                            {/* Docs Header */}
                            <div className="space-y-4 border-b border-gray-200 pb-8">
                                <h1 className="text-4xl font-bold text-gray-900">Documentação de Integração</h1>
                                <p className="text-lg text-gray-600 leading-relaxed">
                                    Este guia descreve a estrutura de dados do CRM para desenvolvedores e integradores.
                                    Utilize as chaves abaixo para mapear campos em Webhooks de Entrada (Typeform, WordPress)
                                    ou para configurar Disparos de Saída (Zapier, n8n).
                                </p>
                                <div className="flex gap-4 pt-2">
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex-1">
                                        <h3 className="font-semibold text-blue-900 mb-1 flex items-center gap-2">
                                            <Code className="w-4 h-4" /> Formato JSON
                                        </h3>
                                        <p className="text-sm text-blue-700">
                                            Todos os payloads devem ser enviados/recebidos em formato JSON plano ou aninhado.
                                            O sistema aceita notação de ponto (ex: <code>deal.titulo</code>) para mapeamento.
                                        </p>
                                    </div>
                                </div>
                            </div>





                            {/* Kanban Stages Section */}
                            <div className="break-inside-avoid">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                    Pipeline & Estágios (Kanban)
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Utilize os IDs abaixo para mover cards entre as etapas do funil via API.
                                </p>
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 w-1/3">Nome da Etapa</th>
                                                <th className="px-4 py-3 w-1/3">ID da Etapa (Código)</th>
                                                <th className="px-4 py-3">Pipeline</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {kanbanStages?.map((stage) => (
                                                <tr key={stage.id} className="hover:bg-gray-50/50">
                                                    <td className="px-4 py-3 font-medium text-gray-900">
                                                        {stage.nome}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <code className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-mono border border-indigo-100 flex items-center justify-between w-fit gap-2">
                                                            {stage.id}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 text-indigo-400 hover:text-indigo-700 p-0"
                                                                onClick={() => copyToClipboard(stage.id)}
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </Button>
                                                        </code>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 text-xs">
                                                        {stage.pipeline_id}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Fields Table */}
                            <div className="space-y-8">
                                {Object.entries(groupedFields).map(([section, sectionFields]) => (
                                    <div key={section} className="break-inside-avoid">
                                        <h3 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">
                                            {section}
                                        </h3>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                                                    <tr>
                                                        <th className="px-4 py-3 w-1/4">Campo / Chave</th>
                                                        <th className="px-4 py-3 w-1/6">Tipo</th>
                                                        <th className="px-4 py-3">Descrição & Exemplo</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 bg-white">
                                                    {sectionFields.map((field) => (
                                                        <tr key={field.key} className="hover:bg-gray-50/50">
                                                            <td className="px-4 py-3 align-top">
                                                                <div className="font-medium text-gray-900">{field.label}</div>
                                                                <code className="text-xs text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded mt-1 inline-block font-mono border border-indigo-100">
                                                                    {field.key}
                                                                </code>
                                                                {field.required && (
                                                                    <span className="ml-2 text-[10px] font-bold text-red-500 uppercase tracking-wide">Obrigatório</span>
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-3 align-top">
                                                                <Badge variant="outline" className="font-mono text-xs text-gray-500">
                                                                    {field.type}
                                                                </Badge>
                                                            </td>
                                                            <td className="px-4 py-3 align-top text-gray-600">
                                                                <p className="mb-1">{field.description}</p>
                                                                <div className="text-xs text-gray-400 font-mono bg-gray-50 p-1.5 rounded border border-gray-100 inline-block">
                                                                    Ex: {field.example}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-10 border-t border-gray-200 text-center text-sm text-gray-400">
                                <p>Gerado automaticamente pelo WelcomeCRM • {new Date().toLocaleDateString()}</p>
                            </div>
                        </div>
                    </ScrollArea>
                </TabsContent>
            </Tabs>
        </div>
    );
}
