import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Select';
import { toast } from 'sonner';
import { Download, RefreshCw, ChevronDown, ChevronRight, Loader2, ArrowRightLeft, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';

// Contact fields from contatos table
const CONTACT_FIELDS = [
    { key: 'nome', label: 'Nome', type: 'text', section: 'basic' },
    { key: 'sobrenome', label: 'Sobrenome', type: 'text', section: 'basic' },
    { key: 'email', label: 'Email', type: 'email', section: 'basic' },
    { key: 'telefone', label: 'Telefone', type: 'phone', section: 'basic' },
    { key: 'data_nascimento', label: 'Data de Nascimento', type: 'date', section: 'basic' },
    { key: 'cpf', label: 'CPF', type: 'text', section: 'documents' },
    { key: 'passaporte', label: 'Passaporte', type: 'text', section: 'documents' },
    { key: 'observacoes', label: 'Observações', type: 'textarea', section: 'other' },
    { key: 'tags', label: 'Tags', type: 'array', section: 'other' },
];

const CONTACT_SECTION_LABELS: Record<string, string> = {
    basic: '👤 Dados Básicos',
    documents: '📄 Documentos',
    other: '📝 Outros',
};

// AC Contact fields - using REAL webhook payload keys from AC
// Standard fields: contact[field_name]
// Custom fields: contact[fields][ID]
const AC_CONTACT_FIELDS = [
    // Standard AC Contact fields - these keys come directly in the payload
    { external_id: 'contact[first_name]', external_name: 'First Name', inferred_section: 'contact_standard' },
    { external_id: 'contact[last_name]', external_name: 'Last Name', inferred_section: 'contact_standard' },
    { external_id: 'contact[email]', external_name: 'Email', inferred_section: 'contact_standard' },
    { external_id: 'contact[phone]', external_name: 'Phone', inferred_section: 'contact_standard' },
    { external_id: 'contact[orgname]', external_name: 'Account (Organization)', inferred_section: 'contact_standard' },

    // Custom AC Contact fields - format: contact[fields][ID]
    // Example from user webhook: contact[fields][353] = wt_primeiro_contato
    { external_id: 'contact[fields][353]', external_name: 'wt_primeiro_contato (ID 353)', inferred_section: 'contact_custom' },
    { external_id: 'data_nascimento', external_name: 'Data de nascimento', inferred_section: 'contact_personal' },
    { external_id: 'conversao_total', external_name: 'Conversão Total', inferred_section: 'contact_tracking' },
    { external_id: 'ultima_conversao', external_name: 'Última conversão', inferred_section: 'contact_tracking' },
    { external_id: 'cpf', external_name: 'CPF', inferred_section: 'contact_personal' },
    { external_id: 'seu_cpf_cadastrado', external_name: 'Seu CPF cadastrado', inferred_section: 'contact_personal' },
    { external_id: 'email_indicacao', external_name: 'E-mail da indicação', inferred_section: 'contact_marketing' },
    { external_id: 'interesses', external_name: 'Interesses', inferred_section: 'contact_preferences' },
    { external_id: 'mes_ideal_viagem', external_name: 'Qual é o mês ideal para a sua viagem?', inferred_section: 'contact_preferences' },
    { external_id: 'mes_ideal_viagem_2', external_name: 'Qual seria o mês ideal para a sua viagem?', inferred_section: 'contact_preferences' },
    { external_id: 'quem_vai_embarcar', external_name: 'Quem vai embarcar com você?', inferred_section: 'contact_preferences' },
    { external_id: 'nome_convite', external_name: 'Nome do Convite', inferred_section: 'contact_personal' },
    { external_id: 'whatsapp', external_name: 'WhatsApp', inferred_section: 'contact_standard' },
    { external_id: 'repetir_data_final', external_name: 'Repetir Data final da ação em formato data (exemplo: 25/04/2025)', inferred_section: 'contact_marketing' },
    { external_id: 'ny_o_que_atrai', external_name: 'NY - O que mais te atrai nessa experiência?', inferred_section: 'contact_preferences' },
    { external_id: 'ny_experiencia_perfeita', external_name: 'NY - O que tornaria essa experiência perfeita para você?', inferred_section: 'contact_preferences' },
    { external_id: 'repetir_data_iso', external_name: 'Repetir Data final da ação em formato ISO (exemplo: AAAA-MM-DD)', inferred_section: 'contact_marketing' },
    { external_id: 'ny_quanto_investir', external_name: 'NY - Quanto você pretende investir', inferred_section: 'contact_preferences' },
    { external_id: 'wwp_investimento_ideal', external_name: 'WWP - Qual seria o investimento de viagem ideal para o seu convidado?', inferred_section: 'contact_preferences' },
    { external_id: 'dw_casar_civil', external_name: 'DW - Pretendem se casar no civil?', inferred_section: 'contact_preferences' },
];

// AC Section labels based on AC structure
const AC_SECTION_LABELS: Record<string, string> = {
    // Contact sections
    'contact_standard': '👤 Contato - Padrão',
    'contact_personal': '📋 Contato - Dados Pessoais',
    'contact_tracking': '📊 Contato - Rastreamento',
    'contact_marketing': '📈 Contato - Marketing',
    'contact_preferences': '🎯 Contato - Preferências',
    'contact_custom': '🔧 Contato - Campos Custom',
    // Deal sections
    'general': '📋 General Details',
    'trips_sdr': '✈️ Trips | SDR',
    'trips_vendas_lazer': '🏖️ Trips | Vendas Lazer',
    'trips_infos_marketing': '📊 Trips | Infos Marketing',
    'weddings_sdr': '💒 Weddings | SDR',
    'weddings_closer': '💍 Weddings | Closer',
    'weddings_infos_marketing': '💐 Weddings | Infos Marketing',
    'general_marketing': '📈 Marketing (UTM)',
};

interface SystemField {
    key: string;
    label: string;
    type: string;
    section: string;
}

interface ExternalField {
    external_id: string;
    external_name: string;
    metadata: Record<string, unknown>;
    inferred_section?: string;
}

interface ACPipeline {
    external_id: string;
    external_name: string;
}

interface InboundFieldMap {
    id: string;
    integration_id: string | null;
    external_field_id: string;
    local_field_key: string;
    entity_type: string;
    source: string;
    direction: string | null;
    section?: string | null;
    external_pipeline_id?: string | null;
    sync_always?: boolean;
    is_active?: boolean;
}

interface InboundFieldMappingTabProps {
    integrationId: string;
}

// Helper to infer AC section from field name
function inferACSection(fieldName: string): string {
    const name = fieldName.toLowerCase();

    // SDR fields
    if (name.includes('sdr wt') || name.includes('sdr-') || name.includes('| sdr') ||
        name.includes('quali') || name.includes('reunião sdr') || name.includes('1a. reunião')) {
        return 'trips_sdr';
    }

    // Vendas/Closer fields
    if (name.includes('vnd wt') || name.includes('vendas lazer') || name.includes('closer')) {
        return name.includes('ww') ? 'weddings_closer' : 'trips_vendas_lazer';
    }

    // Marketing fields
    if (name.includes('utm') || name.includes('origem') || name.includes('campanha')) {
        return 'general_marketing';
    }

    // WT/WTN fields (Trips marketing/general)
    if (name.includes('wt ') || name.includes('wtn ') || name.includes('wtn-') ||
        name.includes('[wt]') || name.includes('tempo para viagem')) {
        return 'trips_infos_marketing';
    }

    // Weddings fields
    if (name.includes('ww') || name.includes('weddings') || name.includes('noivo') ||
        name.includes('casamento') || name.includes('convidados')) {
        if (name.includes('sdr')) return 'weddings_sdr';
        if (name.includes('closer')) return 'weddings_closer';
        return 'weddings_infos_marketing';
    }

    return 'general';
}

export function InboundFieldMappingTab({ integrationId }: InboundFieldMappingTabProps) {
    const queryClient = useQueryClient();
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['trips_sdr', 'general_marketing', 'basic']));
    const [syncingAC, setSyncingAC] = useState(false);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
    const [selectedEntityType, setSelectedEntityType] = useState<string>('deal');
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch system_fields (CRM deal fields)
    const { data: systemFields = [], isLoading: loadingFields } = useQuery({
        queryKey: ['system-fields-for-inbound-mapping'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_fields')
                .select('key, label, type, section')
                .eq('active', true)
                .order('section')
                .order('label');
            if (error) throw error;
            return data as SystemField[];
        },
        enabled: selectedEntityType === 'deal'
    });

    // Get CRM fields based on entity type
    const crmFields = useMemo(() => {
        if (selectedEntityType === 'contact') {
            return CONTACT_FIELDS;
        }
        return systemFields;
    }, [selectedEntityType, systemFields]);

    // 2. Fetch AC pipelines
    const { data: acPipelines = [] } = useQuery({
        queryKey: ['ac-pipelines-catalog-inbound', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'pipeline')
                .order('external_name');
            if (error) throw error;
            return data as ACPipeline[];
        }
    });

    // 3. Fetch external AC fields with inferred sections
    const { data: externalFields = [], isLoading: loadingExternal } = useQuery({
        queryKey: ['ac-fields-catalog-inbound', integrationId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integration_catalog')
                .select('external_id, external_name, metadata')
                .eq('integration_id', integrationId)
                .eq('entity_type', 'field')
                .order('external_name');
            if (error) throw error;

            // Infer section for each field
            return (data || []).map(f => ({
                ...f,
                inferred_section: inferACSection(f.external_name || '')
            })) as ExternalField[];
        }
    });

    // 4. Fetch existing inbound mappings
    const { data: existingMappings = [], isLoading: loadingMappings } = useQuery({
        queryKey: ['inbound-field-mappings', integrationId, selectedPipelineId, selectedEntityType],
        queryFn: async () => {
            let query = supabase
                .from('integration_field_map')
                .select('*')
                .eq('source', 'active_campaign')
                .eq('entity_type', selectedEntityType)
                .eq('integration_id', integrationId)
                .eq('direction', 'inbound');

            // Only filter by pipeline for deals (contacts don't have pipeline)
            if (selectedEntityType === 'deal' && selectedPipelineId) {
                query = query.eq('external_pipeline_id', selectedPipelineId);
            }

            // For contacts, get mappings without pipeline
            if (selectedEntityType === 'contact') {
                query = query.is('external_pipeline_id', null);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []) as InboundFieldMap[];
        }
    });

    // Group AC fields by their inferred section
    const acFieldsBySection = useMemo(() => {
        const grouped: Record<string, ExternalField[]> = {};

        // For contacts, use the standard AC contact fields
        // For deals, use the custom deal fields from the catalog
        let fieldsToGroup: ExternalField[] = selectedEntityType === 'contact'
            ? AC_CONTACT_FIELDS as ExternalField[]
            : externalFields;

        // Filter by search term
        if (searchTerm) {
            fieldsToGroup = fieldsToGroup.filter(f =>
                f.external_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                f.external_id?.includes(searchTerm)
            );
        }

        fieldsToGroup.forEach(f => {
            const section = f.inferred_section || 'general';
            if (!grouped[section]) grouped[section] = [];
            grouped[section].push(f);
        });

        return grouped;
    }, [externalFields, searchTerm]);

    // Lookup for existing mappings by external_field_id
    const mappingByExternalField = useMemo(() => {
        const lookup: Record<string, InboundFieldMap> = {};
        existingMappings.forEach(m => {
            lookup[m.external_field_id] = m;
        });
        return lookup;
    }, [existingMappings]);

    // CRM field options for select
    const crmFieldOptions = useMemo(() => {
        const options = [
            { value: '', label: '— Não mapeado —' }
        ];

        if (selectedEntityType === 'contact') {
            // Contact fields
            Object.entries(CONTACT_SECTION_LABELS).forEach(([sectionKey, sectionLabel]) => {
                const sectionFields = CONTACT_FIELDS.filter(f => f.section === sectionKey);
                if (sectionFields.length > 0) {
                    options.push({ value: `__section_${sectionKey}__`, label: `── ${sectionLabel} ──` });
                    sectionFields.forEach(f => {
                        options.push({ value: f.key, label: `${f.label} (${f.key})` });
                    });
                }
            });
        } else {
            // Deal fields - group by section
            const grouped: Record<string, SystemField[]> = {};
            systemFields.forEach(f => {
                const section = f.section || 'other';
                if (!grouped[section]) grouped[section] = [];
                grouped[section].push(f);
            });

            // Add JSONB storage options
            options.push({ value: '__briefing_inicial__', label: '📝 briefing_inicial (JSONB SDR)' });
            options.push({ value: '__produto_data__', label: '📦 produto_data (JSONB Planner)' });
            options.push({ value: '__marketing_data__', label: '📊 marketing_data (JSONB Raw)' });

            Object.entries(grouped).forEach(([section, fields]) => {
                options.push({ value: `__section_${section}__`, label: `── ${section} ──` });
                fields.forEach(f => {
                    options.push({ value: f.key, label: `${f.label} (${f.key})` });
                });
            });
        }

        return options;
    }, [selectedEntityType, systemFields]);

    // Upsert mapping mutation
    const upsertMapping = useMutation({
        mutationFn: async ({ externalFieldId, localFieldKey }: { externalFieldId: string; localFieldKey: string | null }) => {
            if (!localFieldKey) {
                // Delete mapping
                const deleteQuery = supabase
                    .from('integration_field_map')
                    .delete()
                    .eq('integration_id', integrationId)
                    .eq('external_field_id', externalFieldId)
                    .eq('entity_type', selectedEntityType)
                    .eq('direction', 'inbound');

                if (selectedEntityType === 'deal' && selectedPipelineId) {
                    deleteQuery.eq('external_pipeline_id', selectedPipelineId);
                }

                const { error } = await deleteQuery;
                if (error) throw error;
            } else {
                // Upsert mapping
                const mappingData = {
                    integration_id: integrationId,
                    external_field_id: externalFieldId,
                    local_field_key: localFieldKey,
                    entity_type: selectedEntityType,
                    source: 'active_campaign',
                    direction: 'inbound',
                    external_pipeline_id: selectedEntityType === 'deal' ? selectedPipelineId : null,
                    sync_always: true,
                    is_active: true,
                    updated_at: new Date().toISOString()
                };

                // Try insert, if conflict update
                const { error: insertError } = await supabase
                    .from('integration_field_map')
                    .insert(mappingData);

                if (insertError) {
                    // Update existing
                    const updateQuery = supabase
                        .from('integration_field_map')
                        .update({
                            local_field_key: localFieldKey,
                            updated_at: new Date().toISOString()
                        })
                        .eq('integration_id', integrationId)
                        .eq('external_field_id', externalFieldId)
                        .eq('entity_type', selectedEntityType);

                    if (selectedEntityType === 'deal' && selectedPipelineId) {
                        updateQuery.eq('external_pipeline_id', selectedPipelineId);
                    }

                    const { error: updateError } = await updateQuery;
                    if (updateError) throw updateError;
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['inbound-field-mappings'] });
            toast.success('Mapeamento salvo');
        },
        onError: (e) => toast.error(`Erro: ${e.message}`)
    });

    // Sync AC fields
    const handleSyncACFields = async () => {
        setSyncingAC(true);
        try {
            const { data, error } = await supabase.functions.invoke('integration-sync-catalog', {
                body: { integration_id: integrationId }
            });
            if (error) throw error;
            toast.success(`Sincronizado: ${data.fields_synced || 0} campos do ActiveCampaign`);
            queryClient.invalidateQueries({ queryKey: ['ac-fields-catalog-inbound'] });
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
            toast.error(`Erro ao sincronizar: ${errorMessage}`);
        } finally {
            setSyncingAC(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    const isLoading = loadingFields || loadingExternal || loadingMappings;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const sectionKeys = Object.keys(acFieldsBySection).sort((a, b) => {
        // Priority order - contact sections first, then deal sections
        const order = [
            'contact_standard', 'contact_personal', 'contact_tracking', 'contact_marketing', 'contact_preferences',
            'trips_sdr', 'trips_vendas_lazer', 'trips_infos_marketing', 'general_marketing', 'general'
        ];
        const aIdx = order.indexOf(a);
        const bIdx = order.indexOf(b);
        // If not found in order, put at end
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
    });

    const totalACFields = selectedEntityType === 'contact'
        ? AC_CONTACT_FIELDS.length
        : externalFields.length;
    const mappedCount = existingMappings.length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                Mapeamento de Campos (AC → Welcome)
                            </CardTitle>
                            <CardDescription>
                                Selecione o campo AC e defina para qual campo do CRM ele deve ser mapeado.
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={handleSyncACFields}
                            disabled={syncingAC}
                        >
                            {syncingAC ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            Sincronizar Campos AC
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* Filters */}
            <Card className="border-2 border-slate-200 bg-slate-50/50">
                <CardContent className="py-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Entity Type */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                📋 Tipo de Entidade
                            </label>
                            <Select
                                value={selectedEntityType}
                                onChange={(val) => {
                                    setSelectedEntityType(val);
                                    // Clear pipeline when switching to contact
                                    if (val === 'contact') setSelectedPipelineId('');
                                }}
                                options={[
                                    { value: 'deal', label: '💼 Deals (Negócios)' },
                                    { value: 'contact', label: '👤 Contacts (Contatos)' },
                                ]}
                            />
                            <span className="text-xs text-muted-foreground">
                                {selectedEntityType === 'contact'
                                    ? 'Campos da tabela contatos'
                                    : 'Campos da tabela cards (system_fields)'}
                            </span>
                        </div>

                        {/* Pipeline AC - Only for deals */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-blue-700">
                                🎯 Pipeline AC Origem
                            </label>
                            <Select
                                value={selectedPipelineId}
                                onChange={setSelectedPipelineId}
                                options={[
                                    { value: '', label: '— Todos os pipelines —' },
                                    ...acPipelines.map(p => ({
                                        value: p.external_id,
                                        label: p.external_name
                                    }))
                                ]}
                                disabled={selectedEntityType === 'contact'}
                            />
                            <span className="text-xs text-muted-foreground">
                                {selectedEntityType === 'contact'
                                    ? 'Contatos não pertencem a pipeline'
                                    : selectedPipelineId
                                        ? 'Mapeamentos específicos deste pipeline'
                                        : 'Mostrando mapeamentos globais'}
                            </span>
                        </div>

                        {/* Search */}
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-slate-700">
                                🔍 Buscar Campo AC
                            </label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Filtrar por nome..."
                                    className="pl-9"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold">{totalACFields}</div>
                    <div className="text-xs text-muted-foreground">Campos AC</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold">{crmFields.length}</div>
                    <div className="text-xs text-muted-foreground">
                        Campos CRM ({selectedEntityType === 'contact' ? 'Contatos' : 'Deals'})
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{mappedCount}</div>
                    <div className="text-xs text-muted-foreground">Mapeados</div>
                </div>
            </div>

            {/* AC Fields grouped by AC sections */}
            {sectionKeys.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground">
                    <p>Nenhum campo encontrado.</p>
                    <p className="text-sm mt-2">Clique em "Sincronizar Campos AC" para buscar os campos.</p>
                </Card>
            ) : (
                sectionKeys.map(section => {
                    const fields = acFieldsBySection[section];
                    const isExpanded = expandedSections.has(section);
                    const mappedInSection = fields.filter(f => mappingByExternalField[f.external_id]).length;

                    return (
                        <Card key={section} className="overflow-hidden border border-slate-200 shadow-sm">
                            <CardHeader
                                className="cursor-pointer hover:bg-slate-50 transition-colors py-3"
                                onClick={() => toggleSection(section)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? (
                                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                                        ) : (
                                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                        )}
                                        <CardTitle className="text-base">
                                            {AC_SECTION_LABELS[section] || section}
                                        </CardTitle>
                                        <Badge variant="outline" className="text-xs">
                                            {fields.length} campos
                                        </Badge>
                                        {mappedInSection > 0 && (
                                            <Badge variant="default" className="text-xs bg-green-600">
                                                {mappedInSection} mapeados
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            {isExpanded && (
                                <CardContent className="pt-0">
                                    <div className="border rounded-lg overflow-hidden">
                                        <table className="w-full">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-1/2">
                                                        Campo ActiveCampaign (origem)
                                                    </th>
                                                    <th className="text-center px-2 py-2 text-xs font-medium text-muted-foreground w-8">
                                                        →
                                                    </th>
                                                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground w-1/2">
                                                        Campo CRM (destino)
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {fields.map(field => {
                                                    const mapping = mappingByExternalField[field.external_id];
                                                    const currentValue = mapping?.local_field_key || '';

                                                    return (
                                                        <tr key={field.external_id} className={cn(
                                                            "transition-colors",
                                                            mapping && "bg-green-50/50"
                                                        )}>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-col">
                                                                    <span className="text-sm font-medium">
                                                                        {field.external_name}
                                                                    </span>
                                                                    <span className="text-xs text-muted-foreground font-mono">
                                                                        ID: {field.external_id}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-2 py-3 text-center">
                                                                <ArrowRightLeft className="w-4 h-4 text-muted-foreground mx-auto" />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <Select
                                                                    value={currentValue}
                                                                    onChange={(val) => upsertMapping.mutate({
                                                                        externalFieldId: field.external_id,
                                                                        localFieldKey: val || null
                                                                    })}
                                                                    options={crmFieldOptions.filter(o => !o.value.startsWith('__section_'))}
                                                                    placeholder="Selecione campo CRM..."
                                                                    className="w-full"
                                                                />
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    );
                })
            )}

            {/* Info */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="py-4">
                    <h4 className="font-medium text-sm text-slate-700 mb-2">
                        💡 Como funciona
                    </h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                        <li><strong>Tipo de Entidade:</strong> Deals = campos do card, Contacts = campos do contato</li>
                        <li><strong>Pipeline AC:</strong> Para deals, filtra mapeamentos por pipeline de origem</li>
                        <li><strong>Seções AC:</strong> Os campos são agrupados pelas seções do ActiveCampaign</li>
                        <li><strong>Destinos JSONB:</strong> Use <code>__briefing_inicial__</code> ou <code>__produto_data__</code> para armazenar em JSONB</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
}
