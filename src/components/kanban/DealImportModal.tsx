import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload, Check, Loader2, FileSpreadsheet } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
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
    { key: 'valor', label: 'Valor Total (Faturamento)', required: false },
    { key: 'receita', label: 'Receita (Margem)', required: false },
    { key: 'email_contato', label: 'Email do Contato', required: false },
    { key: 'cpf', label: 'CPF', required: false },
    { key: 'telefone', label: 'Telefone/Celular', required: false },
    { key: 'nome_contato', label: 'Nome do Pagante', required: false },
    { key: 'data_viagem_inicio', label: 'Data Início Viagem', required: false },
    { key: 'data_viagem_fim', label: 'Data Fim Viagem', required: false },
    { key: 'passageiros', label: 'Passageiros (vírgula)', required: false },
    { key: 'produtos', label: 'Produtos (vírgula)', required: false },
    { key: 'fornecedores', label: 'Fornecedores (vírgula)', required: false },
    { key: 'consultor', label: 'Consultora/Vendedor', required: false },
]

type RowData = Record<string, unknown>

export default function DealImportModal({ isOpen, onClose, onSuccess, currentProduct }: DealImportModalProps) {
    const { session } = useAuth()
    const [step, setStep] = useState<'upload' | 'mapping' | 'importing' | 'results'>('upload')
    const [fileData, setFileData] = useState<RowData[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<Mapping>({})
    const [isImporting, setIsImporting] = useState(false)
    const [importResults, setImportResults] = useState<{ success: number; skipped: number; errors: string[] }>({ success: 0, skipped: 0, errors: [] })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Resolve effective product (default to TRIPS if ALL)
    const effectiveProduct: Product = currentProduct === 'ALL' ? 'TRIPS' : currentProduct
    const currentUserId = session?.user?.id

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

    // Fetch Stages - prioritize "Ganho" stage for won deals
    const { data: stages } = useQuery({
        queryKey: ['stages-for-pipeline', pipeline?.id],
        queryFn: async () => {
            if (!pipeline?.id) return []
            const { data } = await supabase
                .from('pipeline_stages')
                .select('id, nome')
                .eq('pipeline_id', pipeline.id)
                .eq('ativo', true)
                .order('ordem', { ascending: true })
            return data || []
        },
        enabled: !!pipeline?.id
    })

    // Find the "Viagem Concluída" stage for imported sales (already completed trips)
    const viagemConcluidaStage = stages?.find(s =>
        s.nome.toLowerCase().includes('conclu') ||
        s.nome.toLowerCase().includes('finalizada')
    ) || stages?.find(s =>
        s.nome.toLowerCase().includes('ganho') ||
        s.nome.toLowerCase().includes('confirmada')
    )

    const handleDownloadTemplate = () => {
        const template = [
            {
                'Título da Venda': 'Viagem Maceió - João Silva',
                'Valor Total (Faturamento)': 64918,
                'Receita (Margem)': 5747.44,
                'Email do Contato': 'cliente@email.com',
                'CPF': '12345678900',
                'Telefone': '41996717848',
                'Nome do Pagante': 'João Silva',
                'Data Início Viagem': '2024-02-07',
                'Data Fim Viagem': '2024-02-11',
                'Passageiros (vírgula)': 'João Silva, Maria Silva',
                'Produtos (vírgula)': 'Diárias de Hospedagem, Transfer',
                'Fornecedores (vírgula)': 'Hotel Resort, Transfer Service',
                'Consultora/Vendedor': 'Ana Consultora',
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
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]

            if (rows.length === 0) {
                toast.error('O arquivo está vazio')
                return
            }

            const sheetHeaders = (rows[0] as unknown[]).map(h => String(h || '').trim()).filter(h => h !== '')
            const data = XLSX.utils.sheet_to_json(ws) as RowData[]

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

    const cleanPhone = (phone: unknown) => String(phone || '').replace(/\D/g, '')

    const splitName = (fullName: string) => {
        const parts = fullName.trim().split(/\s+/)
        if (parts.length <= 1) return { nome: parts[0] || '', sobrenome: '' }
        return { nome: parts[0], sobrenome: parts.slice(1).join(' ') }
    }

    const findContact = async (row: RowData) => {
        // Priority 1: Email
        const email = row['email_contato'] ? String(row['email_contato']).trim() : null
        if (email) {
            const { data } = await supabase.from('contatos').select('id').ilike('email', email).maybeSingle()
            if (data) return data.id
        }

        // Priority 2: CPF
        const cpfRaw = row['cpf'] ? String(row['cpf']).replace(/\D/g, '') : null
        if (cpfRaw && cpfRaw.length >= 11) {
            const { data } = await supabase.from('contatos').select('id').eq('cpf', cpfRaw).maybeSingle()
            if (data) return data.id
        }

        // Priority 3: Phone (Last 8 digits)
        const phoneRaw = cleanPhone(row['telefone'])
        if (phoneRaw && phoneRaw.length >= 8) {
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

    const findOrCreateContact = async (row: RowData): Promise<string | null> => {
        const existingId = await findContact(row)
        if (existingId) return existingId

        // Create new contact from available data
        const name = row['nome_contato'] ? String(row['nome_contato']).trim() : null
        if (!name) return null

        const { nome, sobrenome } = splitName(name)
        const cpfRaw = row['cpf'] ? String(row['cpf']).replace(/\D/g, '') : null
        const email = row['email_contato'] ? String(row['email_contato']).trim() : null
        const telefone = cleanPhone(row['telefone']) || null

        const { data, error } = await supabase.from('contatos').insert({
            nome,
            sobrenome: sobrenome || null,
            cpf: cpfRaw && cpfRaw.length >= 11 ? cpfRaw : null,
            email,
            telefone,
        }).select('id').single()

        if (error) {
            console.error('Erro ao criar contato:', error)
            return null
        }
        return data.id
    }

    const findOrCreatePassenger = async (fullName: string): Promise<string | null> => {
        const trimmed = fullName.trim()
        if (!trimmed) return null

        // Try to find by name
        const { nome, sobrenome } = splitName(trimmed)
        const { data: existing } = await supabase
            .from('contatos')
            .select('id')
            .ilike('nome', nome)
            .ilike('sobrenome', sobrenome || '')
            .limit(1)
        if (existing && existing.length > 0) return existing[0].id

        // Create with just name
        const { data, error } = await supabase.from('contatos').insert({
            nome,
            sobrenome: sobrenome || null,
        }).select('id').single()

        if (error) {
            console.error('Erro ao criar passageiro:', error)
            return null
        }
        return data.id
    }

    const resolveConsultor = async (consultorName: string | null): Promise<string | null> => {
        if (!consultorName) return null
        const trimmed = String(consultorName).trim()
        if (!trimmed) return null

        const { data } = await supabase
            .from('profiles')
            .select('id')
            .or(`nome.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
            .limit(1)
        return data && data.length > 0 ? data[0].id : null
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
                const row: RowData = {}

                // Extract mapped values
                Object.keys(mapping).forEach(key => {
                    row[key] = rawRow[mapping[key]]
                })

                try {
                    // 1. Resolve Contact (find or create)
                    const contactId = await findOrCreateContact(row)

                    if (!contactId) {
                        skippedCount++
                        errors.push(`Linha ${i + 2}: Sem dados suficientes para criar contato (Nome: ${row['nome_contato']})`)
                        continue
                    }

                    // 2. Resolve Stage
                    const stageId = viagemConcluidaStage?.id || stages?.[0]?.id || null

                    const excelDateToISO = (serial: unknown) => {
                        if (!serial) return null
                        if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) return serial
                        const serialNum = Number(serial)
                        if (!isNaN(serialNum)) {
                            const date = new Date((serialNum - 25569) * 86400 * 1000)
                            return date.toISOString().split('T')[0]
                        }
                        return null
                    }

                    // 3. Resolve Consultor
                    const consultorId = await resolveConsultor(row['consultor'] as string | null)

                    const valorTotal = Number(row['valor']) || 0
                    const receita = Number(row['receita']) || 0
                    const dataInicio = excelDateToISO(row['data_viagem_inicio'])

                    // 4. Create Card
                    const cardData: Record<string, unknown> = {
                        titulo: row['titulo'],
                        pessoa_principal_id: contactId,
                        pipeline_id: pipeline.id,
                        pipeline_stage_id: stageId,
                        produto: effectiveProduct,
                        valor_estimado: valorTotal,
                        valor_final: valorTotal,
                        receita: receita,
                        receita_source: 'manual',
                        data_viagem_inicio: dataInicio,
                        data_viagem_fim: excelDateToISO(row['data_viagem_fim']),
                        data_fechamento: dataInicio || new Date().toISOString(),
                        origem: 'manual',
                        status_comercial: 'ganho',
                        estado_operacional: 'finalizado',
                        moeda: 'BRL',
                        dono_atual_id: consultorId || currentUserId,
                        vendas_owner_id: consultorId || null,
                        briefing_inicial: {
                            importado_em: new Date().toISOString(),
                            produtos: row['produtos'] || null,
                            fornecedores: row['fornecedores'] || null,
                        }
                    }

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { data: insertedCard, error } = await supabase.from('cards').insert(cardData as any).select('id').single()

                    if (error || !insertedCard) {
                        console.error('Erro detalhado Supabase (Insert Card):', error)
                        throw error || new Error('Card insert retornou null')
                    }

                    const cardId = insertedCard.id

                    // 5. Link pagante as titular in cards_contatos
                    await supabase.from('cards_contatos').insert({
                        card_id: cardId,
                        contato_id: contactId,
                        tipo_viajante: 'titular',
                    })

                    // 6. Link passengers
                    if (row['passageiros']) {
                        const paganteName = row['nome_contato'] ? String(row['nome_contato']).trim().toLowerCase() : ''
                        const passengers = String(row['passageiros']).split(',').map((p: string) => p.trim()).filter(Boolean)

                        for (const passengerName of passengers) {
                            if (passengerName.toLowerCase() === paganteName) continue
                            const passengerId = await findOrCreatePassenger(passengerName)
                            if (passengerId) {
                                await supabase.from('cards_contatos').insert({
                                    card_id: cardId,
                                    contato_id: passengerId,
                                    tipo_viajante: 'acompanhante',
                                })
                            }
                        }
                    }

                    // 7. Create financial item + recalculate (uses existing infra)
                    if (valorTotal > 0) {
                        const supplierCost = valorTotal - receita
                        await supabase.from('card_financial_items').insert({
                            card_id: cardId,
                            product_type: 'custom',
                            description: String(row['produtos'] || 'Importação histórica'),
                            sale_value: valorTotal,
                            supplier_cost: supplierCost > 0 ? supplierCost : 0,
                        })
                        await supabase.rpc('recalcular_financeiro_manual', { p_card_id: cardId })
                    }

                    successCount++

                } catch (err: unknown) {
                    skippedCount++
                    const e = err as Record<string, string>
                    const errorMsg = e.details || e.message || JSON.stringify(err)
                    errors.push(`Linha ${i + 2}: Erro ao criar venda - ${errorMsg}`)
                }
            }

            setImportResults({ success: successCount, skipped: skippedCount, errors })
            setStep('results')
            if (successCount > 0) {
                // Do not instantly reload, let user see results
                // onSuccess() can be called when closing or manually
            }

        } catch (error: unknown) {
            console.error('Import fatal error:', error)
            toast.error(`Erro fatal na importação: ${error instanceof Error ? error.message : String(error)}`)
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
                        Importe vendas históricas com contatos, passageiros e dados financeiros.
                        <br />
                        <span className="text-emerald-600 font-medium text-xs">
                            Contatos não encontrados serão criados automaticamente. Passageiros serão vinculados à viagem.
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
                                    <div className="text-sm text-amber-800">Ignorados / Erros</div>
                                </div>
                            </div>

                            {importResults.errors.length > 0 && (
                                <div className="max-h-[200px] overflow-y-auto p-3 bg-red-50 border border-red-100 rounded text-xs font-mono text-red-700">
                                    {importResults.errors.map((err, i) => <div key={i}>{err}</div>)}
                                </div>
                            )}

                            <Button onClick={() => { onSuccess(); onClose() }} className="w-full">Concluir</Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
