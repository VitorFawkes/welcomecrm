import { useState, useRef } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Upload, FileText, AlertTriangle, CheckCircle2, RotateCcw, XCircle, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function IntegrationImport() {
    const queryClient = useQueryClient();

    // Fetch ActiveCampaign Integration ID
    const { data: integrationId } = useQuery({
        queryKey: ['active-campaign-integration-id'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('integrations')
                .select('id')
                .eq('provider', 'active_campaign')
                .single();
            if (error) {
                console.error('ActiveCampaign integration not found:', error);
                return null;
            }
            return data.id;
        }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [debugInfo, setDebugInfo] = useState<{ headers: string[], firstRow: any } | null>(null);
    const [importMode, setImportMode] = useState<'replay' | 'new_lead'>('replay');
    const [defaultStageId, setDefaultStageId] = useState<string>('');
    const [defaultStageError, setDefaultStageError] = useState<string | null>(null);
    const [, setIsParsing] = useState(false);

    // Fetch Mappings for Preview
    const { data: stageMappings } = useQuery({
        queryKey: ['integration-stage-map', integrationId],
        queryFn: async () => {
            if (!integrationId) return [];
            const { data, error } = await supabase
                .from('integration_stage_map')
                .select('*')
                .eq('integration_id', integrationId);
            if (error) throw error;
            return data;
        },
        enabled: !!integrationId
    });

    const validateUuid = (id: string) => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    };

    const handleDefaultStageChange = (val: string) => {
        setDefaultStageId(val);
        if (val && !validateUuid(val)) {
            setDefaultStageError('ID deve ser um UUID válido (ex: 550e8400-e29b-41d4-a716-446655440000)');
        } else {
            setDefaultStageError(null);
        }
    };

    // --- CSV Parsing Logic ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsParsing(true);
        setPreviewData([]);
        setDebugInfo(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const rows = text.split('\n').filter(r => r.trim());

                // Robust header cleaning: trim and remove surrounding quotes
                const headers = rows[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

                // 1. First Pass: Parse all rows and build Deal -> Pipeline Map
                const rawObjects = rows.slice(1).map((row, idx) => {
                    // Robust value splitting (still simple, but handles basic quotes)
                    const values = row.split(',');
                    const obj: any = {};
                    headers.forEach((h, i) => {
                        const val = values[i]?.trim();
                        obj[h] = val ? val.replace(/^"|"$/g, '') : val;
                    });

                    // Generate row_key if missing
                    if (!obj.row_key && obj.entity && obj.entity_id) {
                        obj.row_key = `${obj.entity}:${obj.entity_id}:${Date.now() + idx}`;
                    }
                    return obj;
                }).filter(o => o.entity && o.entity_id);

                // Debug Info
                if (rawObjects.length > 0) {
                    setDebugInfo({
                        headers,
                        firstRow: rawObjects[0]
                    });
                }

                // Build Map: deal_id -> pipeline_id
                const dealPipelineMap = new Map<string, string>();
                rawObjects.forEach(obj => {
                    const pid = obj.pipeline || obj.pipeline_id;
                    const dealId = obj.deal_id || (obj.entity === 'deal' ? obj.entity_id : null);

                    if (pid && dealId) {
                        dealPipelineMap.set(dealId, pid.toString());
                    }

                    // Fallback: Try to parse raw_json_string for group/pipeline
                    if (!pid && dealId && obj.raw_json_string) {
                        try {
                            // Heuristic: sometimes raw_json has "group":"8" or similar
                            // This is a loose check, might need adjustment based on actual JSON structure
                            if (obj.raw_json_string.includes('"group":"8"')) dealPipelineMap.set(dealId, '8');
                            if (obj.raw_json_string.includes('"group":"6"')) dealPipelineMap.set(dealId, '6');
                        } catch (e) { /* ignore */ }
                    }
                });

                // 2. Second Pass: Fill missing pipelines and Validate
                const parsed = rawObjects.map(obj => {
                    const dealId = obj.deal_id || (obj.entity === 'deal' ? obj.entity_id : null);

                    // Infer pipeline if missing
                    if (!obj.pipeline && !obj.pipeline_id && dealId) {
                        const inferred = dealPipelineMap.get(dealId);
                        if (inferred) {
                            obj.pipeline = inferred;
                            obj._inferred = true; // Marker for UI if needed
                        }
                    }
                    // Normalize Pipeline ID
                    const rawPipeline = obj.pipeline || obj.pipeline_id;
                    if (rawPipeline) {
                        obj.pipeline = rawPipeline.toString();
                        if (obj.pipeline !== '6' && obj.pipeline !== '8') {
                            obj._error = `Pipeline ${obj.pipeline} não suportado (apenas 6 e 8)`;
                        }
                    }

                    return obj;
                });

                setPreviewData(parsed);
                toast.success(`${parsed.length} eventos identificados.`);
            } catch (err) {
                toast.error('Erro ao ler CSV. Verifique o formato.');
                console.error(err);
            } finally {
                setIsParsing(false);
            }
        };
        reader.readAsText(selectedFile);
    };

    // --- Import Mutation ---
    const importMutation = useMutation({
        mutationFn: async () => {
            if (previewData.length === 0) return;
            if (!integrationId) {
                throw new Error('Integração ActiveCampaign não encontrada. Contate o suporte.');
            }

            // Batch insert in chunks of 100
            const chunkSize = 100;
            for (let i = 0; i < previewData.length; i += chunkSize) {
                const chunk = previewData.slice(i, i + chunkSize);

                const events = chunk.map(row => {
                    const payload = {
                        ...row,
                        import_mode: importMode,
                        default_stage_id: importMode === 'new_lead' ? defaultStageId : undefined,
                        pipeline: row.pipeline || (row.pipeline_id ? row.pipeline_id.toString() : undefined)
                    };
                    return {
                        row_key: row.row_key,
                        source: 'csv_import',
                        entity_type: row.entity || row.type || 'unknown',
                        external_id: row.entity_id || row.id,
                        event_type: row.change_type || row.event_type || 'import',
                        payload: payload, // Store full row as payload
                        status: 'pending',
                        processing_log: `Imported via CSV (Pipeline: ${row.pipeline || 'N/A'})`,
                        integration_id: integrationId
                    };
                });

                const { error } = await supabase
                    .from('integration_events')
                    .upsert(events, { onConflict: 'row_key', ignoreDuplicates: true });

                if (error) throw error;
            }
        },
        onSuccess: () => {
            toast.success('Importação concluída! Eventos na fila.');
            setFile(null);
            setPreviewData([]);
            queryClient.invalidateQueries({ queryKey: ['integration-logs'] });
        },
        onError: (e: any) => toast.error(`Erro na importação: ${e.message}`)
    });

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- Upload Card --- */}
                <Card className="bg-card border-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                            <Upload className="w-5 h-5 text-blue-500" />
                            Importar CSV (Replay)
                        </CardTitle>
                        <CardDescription>
                            Carregue um arquivo CSV com eventos para reprocessamento.
                            <br />
                            Colunas esperadas: <code>row_key, entity, entity_id, change_type...</code>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div
                            className="border-2 border-dashed border-border rounded-lg p-8 =text-center hover:bg-muted transition-colors cursor-pointer"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                type="file"
                                accept=".csv"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                            />
                            {file ? (
                                <div className="flex flex-col items-center gap-2">
                                    <FileText className="w-8 h-8 text-green-500" />
                                    <p className="font-medium text-foreground">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                    <Upload className="w-8 h-8 opacity-50" />
                                    <p>Clique para selecionar ou arraste aqui</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 flex justify-end">
                            <Button variant="outline" size="sm" onClick={() => window.open('/api/template-csv', '_blank')} disabled>
                                <XCircle className="w-4 h-4 mr-2" />
                                Baixar Template (Em breve)
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* --- Stats Card --- */}
                <div className="grid gap-6">
                    {/* Mode Selection */}
                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-foreground text-base">Modo de Importação</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-4">
                                <div
                                    className={cn(
                                        "flex-1 p-4 rounded-lg border cursor-pointer transition-all",
                                        importMode === 'replay'
                                            ? "bg-purple-500/20 border-purple-500/50"
                                            : "bg-muted/30 border-white/10 hover:bg-muted/50"
                                    )}
                                    onClick={() => setImportMode('replay')}
                                >
                                    <div className="font-bold mb-1 flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4" />
                                        Replay / Backfill
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Recria o histórico exato do ActiveCampaign. Exige snapshot (deal_state) e mapeamento rigoroso.
                                    </p>
                                </div>
                                <div
                                    className={cn(
                                        "flex-1 p-4 rounded-lg border cursor-pointer transition-all",
                                        importMode === 'new_lead'
                                            ? "bg-green-500/20 border-green-500/50"
                                            : "bg-muted/30 border-white/10 hover:bg-muted/50"
                                    )}
                                    onClick={() => setImportMode('new_lead')}
                                >
                                    <div className="font-bold mb-1 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Novos Leads
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Cria leads novos na etapa escolhida. Ignora histórico antigo. Ideal para listas frias.
                                    </p>
                                </div>
                            </div>

                            {importMode === 'new_lead' && (
                                <div className="pt-2">
                                    <label className="text-sm font-medium mb-2 block">Etapa Inicial (Opcional)</label>
                                    <Input
                                        placeholder="ID da Etapa (UUID do Welcome)"
                                        value={defaultStageId}
                                        onChange={(e) => handleDefaultStageChange(e.target.value)}
                                        className={cn("max-w-md", defaultStageError ? "border-red-500" : "")}
                                    />
                                    {defaultStageError && (
                                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {defaultStageError}
                                        </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Se vazio, tentará usar a etapa do CSV. Deve ser o UUID da etapa no Welcome.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-foreground">Resumo da Importação</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {debugInfo && (
                                <div className="p-3 bg-muted/50 rounded text-xs font-mono overflow-x-auto mb-4 border border-dashed">
                                    <p className="font-bold mb-1">Debug Info:</p>
                                    <p>Headers: {JSON.stringify(debugInfo.headers)}</p>
                                    <p className="mt-1">First Row: {JSON.stringify(debugInfo.firstRow)}</p>
                                </div>
                            )}
                            <div className="flex justify-between items-center p-3 bg-muted rounded">
                                <span className="text-sm text-muted-foreground">Linhas Identificadas</span>
                                <span className="font-mono font-bold text-lg text-foreground">{previewData.length}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-muted rounded">
                                <span className="text-sm text-muted-foreground">Estimativa de Deals</span>
                                <span className="font-mono font-bold text-lg text-foreground">
                                    {new Set(previewData.map(r => r.deal_id || (r.entity === 'deal' ? r.entity_id : null)).filter(Boolean)).size}
                                </span>
                            </div>

                            {previewData.length > 0 && (
                                <Button
                                    className="w-full"
                                    onClick={() => importMutation.mutate()}
                                    disabled={importMutation.isPending}
                                >
                                    {importMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Check className="w-4 h-4 mr-2" />
                                    )}
                                    Confirmar Importação
                                </Button>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* --- Preview Table --- */}
                {previewData.length > 0 && (
                    <div className="col-span-1 md:col-span-2">
                        <Card className="bg-card border-border overflow-hidden">
                            <CardHeader>
                                <CardTitle className="text-foreground">Pré-visualização (Primeiros 50)</CardTitle>
                            </CardHeader>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted text-muted-foreground">
                                        <tr>
                                            <th className="p-3">Row Key</th>
                                            <th className="p-3">Entity</th>
                                            <th className="p-3">ID</th>
                                            <th className="p-3">Pipeline (AC)</th>
                                            <th className="p-3">Stage (AC &rarr; Welcome)</th>
                                            <th className="p-3">Deal ID</th>
                                            <th className="p-3">Change Type</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {previewData.slice(0, 50).map((row, i) => {
                                            const acStageId = row.stage || row.stage_id;
                                            const acPipelineId = row.pipeline || row.pipeline_id;
                                            const mapping = stageMappings?.find(m => m.external_stage_id === acStageId && m.pipeline_id === acPipelineId);
                                            const welcomeStageId = mapping?.internal_stage_id;

                                            return (
                                                <tr key={i} className="hover:bg-muted/50">
                                                    <td className="p-3 font-mono text-xs text-foreground">{row.row_key || '-'}</td>
                                                    <td className="p-3">
                                                        <Badge variant="outline">{row.entity}</Badge>
                                                    </td>
                                                    <td className="p-3 font-mono text-xs text-foreground">{row.entity_id}</td>
                                                    <td className="p-3">
                                                        {row.pipeline ? (
                                                            <Badge variant={row._error ? "destructive" : "secondary"}>
                                                                {row.pipeline}
                                                            </Badge>
                                                        ) : '-'}
                                                        {row._error && <span className="text-xs text-red-500 block">{row._error}</span>}
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs text-muted-foreground">AC: {acStageId || '-'}</span>
                                                            {welcomeStageId ? (
                                                                <span className="text-xs text-green-400 flex items-center gap-1">
                                                                    <Check className="w-3 h-3" />
                                                                    {welcomeStageId.slice(0, 8)}...
                                                                </span>
                                                            ) : (
                                                                acStageId && <span className="text-xs text-red-400">Sem Mapa</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 font-mono text-xs text-foreground">{row.deal_id}</td>
                                                    <td className="p-3 text-muted-foreground">{row.change_type}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
