import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload, Check, Loader2, FileSpreadsheet } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import type { Database } from '../../database.types'

type Product = Database['public']['Enums']['app_product']

interface DealImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    currentProduct: Product | 'ALL'
}

interface Mapping {
    [key: string]: string
}

const DEAL_FIELDS = [
    { key: 'titulo', label: 'Título da Venda', required: true },
    { key: 'valor', label: 'Valor (Estimado/Final)', required: false },
    { key: 'categoria', label: 'Categoria (Ex: Aéreo, Hotel)', required: false },
    { key: 'email_contato', label: 'Email do Contato (Prioridade 1)', required: false },
    { key: 'cpf', label: 'CPF (Prioridade 2)', required: false },
    { key: 'telefone', label: 'Telefone/Celular (Prioridade 3)', required: false },
    { key: 'nome_contato', label: 'Nome do Contato (Prioridade 4)', required: false },
    { key: 'data_viagem_inicio', label: 'Data Viagem (Início)', required: false },
]

export default function DealImportModal({ isOpen, onClose, onSuccess, currentProduct }: DealImportModalProps) {
    const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'results'>('upload')
    const [fileData, setFileData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<Mapping>({})
    const [isImporting, setIsImporting] = useState(false)
    const [importResults, setImportResults] = useState<{ success: number; skipped: number; errors: string[] }>({ success: 0, skipped: 0, errors: [] })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Resolve effective product (default to TRIPS if ALL)
    const effectiveProduct: Product = currentProduct === 'ALL' ? 'TRIPS' : currentProduct

    // Fetch Pipeline ID
    const { data: pipeline } = useQuery({
        queryKey: ['pipeline-for-product', effectiveProduct],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipelines')
                .select('id')
                .eq('produto', effectiveProduct)
                .eq('ativo', true)
                .single()
            return data
        },
        enabled: isOpen
    })

    // Fetch Stages for fallback
    const { data: stages } = useQuery({
        queryKey: ['stages-for-pipeline', pipeline?.id],
        queryFn: async () => {
            if (!pipeline?.id) return []
            const { data } = await supabase
                .from('pipeline_stages')
                .select('id, nome')
                .eq('pipeline_id', pipeline.id)
                .order('ordem', { ascending: true })
            return data || []
        },
        enabled: !!pipeline?.id
    })

    const handleDownloadTemplate = () => {
        const template = [
            {
                'Título da Venda': 'Viagem Paris 2024',
                'Valor': 15000,
                'Categoria': 'Pacote Completo',
                'Email do Contato': 'cliente@email.com',
                'CPF': '123.456.789-00',
                'Telefone': '11999999999',
                'Nome do Contato': 'João Silva',
                'Data Viagem (Início)': '2024-12-01'
            }
        ]
        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importação Vendas')
        XLSX.writeFile(wb, 'modelo_importacao_vendas.xlsx')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

            if (rows.length === 0) {
                toast.error('O arquivo está vazio')
                return
            }

            const sheetHeaders = (rows[0] as any[]).map(h => String(h || '').trim()).filter(h => h !== '')
            const data = XLSX.utils.sheet_to_json(ws)

            setHeaders(sheetHeaders)
            setFileData(data)

            // Auto-mapping
            const initialMapping: Mapping = {}
            DEAL_FIELDS.forEach(field => {
                const match = sheetHeaders.find(h =>
                    h.toLowerCase() === field.label.toLowerCase() ||
                    h.toLowerCase() === field.key.toLowerCase()
                )
                if (match) initialMapping[field.key] = match
            })
            setMapping(initialMapping)
            setStep('mapping')
        }
        reader.readAsBinaryString(file)
    }

    const cleanPhone = (phone: any) => String(phone || '').replace(/\D/g, '')

    const findContact = async (row: any) => {
        // Priority 1: Email
        const email = row['email_contato'] ? String(row['email_contato']).trim() : null
        if (email) {
            const { data } = await supabase.from('contatos').select('id').ilike('email', email).maybeSingle()
            if (data) return data.id
        }

        // Priority 2: CPF
        const cpfRaw = row['cpf'] ? String(row['cpf']).replace(/\D/g, '') : null
        if (cpfRaw && cpfRaw.length >= 11) {
            const { data } = await supabase.from('contatos').select('id').eq('cpf', cpfRaw).maybeSingle() // Assuming CPF is stored raw or we need to fuzzy match? Usually stored formatted or raw. Let's try direct match first.
            // Actually, CPFs can be messy. Let's rely on flexible comparison if possible, but exact match is safer for now.
            if (data) return data.id
        }

        // Priority 3: Phone (Last 8 digits)
        const phoneRaw = cleanPhone(row['telefone'])
        if (phoneRaw && phoneRaw.length >= 8) {
            // Hard to do fuzzy "ends with" efficiently without full scan or specific index. 
            // Using ilike '%12345678'
            const { data } = await supabase.from('contatos').select('id').ilike('celular', `%${phoneRaw.slice(-8)}`).limit(1)
            if (data && data.length > 0) return data[0].id

            // Try 'telefone' field too
            const { data: dataTel } = await supabase.from('contatos').select('id').ilike('telefone', `%${phoneRaw.slice(-8)}`).limit(1)
            if (dataTel && dataTel.length > 0) return dataTel[0].id
        }

        // Priority 4: Name (Exact)
        const name = row['nome_contato'] ? String(row['nome_contato']).trim() : null
        if (name) {
            const { data } = await supabase.from('contatos').select('id').ilike('nome', name).limit(1)
            if (data && data.length > 0) return data[0].id
        }

        return null
    }

    const handleImport = async () => {
        if (!pipeline) {
            toast.error('Pipeline não encontrado.')
            return
        }

        const requiredMissing = DEAL_FIELDS.filter(f => f.required && !mapping[f.key])
        if (requiredMissing.length > 0) {
            toast.error(`Mapeamento obrigatório ausente: ${requiredMissing.map(f => f.label).join(', ')}`)
            return
        }

        setIsImporting(true)
        setStep('importing')

        let successCount = 0
        let skippedCount = 0
        const errors: string[] = []

        try {
            // Process sequentially to be safe with async lookups
            for (let i = 0; i < fileData.length; i++) {
                const rawRow = fileData[i]
                const row: any = {}

                // Extract mapped values
                Object.keys(mapping).forEach(key => {
                    row[key] = rawRow[mapping[key]]
                })

                try {
                    // 1. Resolve Contact
                    const contactId = await findContact(row)

                    if (!contactId) {
                        skippedCount++
                        errors.push(`Linha ${i + 2}: Contato não encontrado (Email: ${row['email_contato']}, CPF: ${row['cpf']}, Nome: ${row['nome_contato']})`)
                        continue
                    }

                    // 2. Resolve Stage
                    // For WON deals, we can use the first stage id as placeholder or look for a specific "won" stage if needed.
                    // But effectively we are setting status_comercial = 'ganho'.
                    let stageId = stages?.[0]?.id // Default to first stage if exists

                    // 3. Create Card
                    const { error } = await supabase.from('cards').insert({
                        titulo: row['titulo'],
                        pessoa_principal_id: contactId,
                        pipeline_id: pipeline.id,
                        pipeline_stage_id: stageId,
                        produto: effectiveProduct,
                        valor_final: row['valor'] || 0,
                        data_viagem_inicio: row['data_viagem_inicio'] || null,
                        origem: 'importacao_excel',
                        status_comercial: 'ganho',
                        data_fechamento: new Date().toISOString(),
                        moeda: 'BRL',
                        briefing_inicial: {
                            importado_em: new Date().toISOString(),
                            categoria: row['categoria'] || 'Geral'
                        }
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    } as any)

                    if (error) throw error
                    successCount++

                } catch (err: any) {
                    skippedCount++
                    errors.push(`Linha ${i + 2}: Erro ao criar venda - ${err.message}`)
                }
            }

            setImportResults({ success: successCount, skipped: skippedCount, errors })
            setStep('results')
            if (successCount > 0) onSuccess()

        } catch (error: any) {
            console.error('Import fatal error:', error)
            toast.error(`Erro fatal na importação: ${error.message}`)
            setStep('mapping')
        } finally {
            setIsImporting(false)
        }
    }

    const reset = () => {
        setStep('upload')
        setFileData([])
        setHeaders([])
        setMapping({})
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-md border border-slate-200">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold text-slate-900">Importar Vendas (Excel)</DialogTitle>
                    <DialogDescription>
                        Importe vendas e associe automaticamente a contatos existentes.
                        <br />
                        <span className="text-yellow-600 font-medium text-xs">
                            Nota: Linhas sem contatos correspondentes (Email, CPF, Tel ou Nome) serão ignoradas.
                        </span>
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 transition-colors hover:bg-slate-50">
                            <Upload className="h-12 w-12 text-slate-400 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">Selecione seu arquivo</h3>
                            <div className="flex gap-4 mt-4">
                                <Button variant="outline" onClick={handleDownloadTemplate} className="gap-2">
                                    <Download className="h-4 w-4" /> Modelo
                                </Button>
                                <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                                    <FileSpreadsheet className="h-4 w-4" /> Escolher Arquivo
                                </Button>
                            </div>
                            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} />
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="max-h-[300px] overflow-y-auto pr-2 custom-scrollbar border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-slate-50 border-b">
                                        <tr>
                                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Campo Sistema</th>
                                            <th className="text-left py-2 px-3 font-semibold text-slate-700">Coluna Excel</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {DEAL_FIELDS.map(field => (
                                            <tr key={field.key}>
                                                <td className="py-3 px-3">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </td>
                                                <td className="py-3 px-3">
                                                    <select
                                                        value={mapping[field.key] || ''}
                                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                        className="w-full h-9 px-2 bg-white border border-slate-200 rounded text-sm"
                                                    >
                                                        <option value="">Ignorar</option>
                                                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-between pt-4">
                                <Button variant="ghost" onClick={reset}>Voltar</Button>
                                <Button onClick={handleImport} disabled={isImporting}>
                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                    Importar
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                            <p className="text-slate-600">Processando vendas e buscando contatos...</p>
                        </div>
                    )}

                    {step === 'results' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">{importResults.success}</div>
                                    <div className="text-sm text-green-800">Importados</div>
                                </div>
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-amber-600">{importResults.skipped}</div>
                                    <div className="text-sm text-amber-800">Ignorados (Contato não achado)</div>
                                </div>
                            </div>

                            {importResults.errors.length > 0 && (
                                <div className="max-h-[200px] overflow-y-auto p-3 bg-red-50 border border-red-100 rounded text-xs font-mono text-red-700">
                                    {importResults.errors.map((err, i) => <div key={i}>{err}</div>)}
                                </div>
                            )}

                            <Button onClick={onClose} className="w-full">Concluir</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
