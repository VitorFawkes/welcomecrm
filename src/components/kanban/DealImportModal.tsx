import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload, Check, Loader2, FileSpreadsheet, ExternalLink } from 'lucide-react'
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
    const [importedCards, setImportedCards] = useState<{ id: string; titulo: string; valor: number }[]>([])
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

            // Auto-mapping with extra keyword aliases for common Brazilian headers
            const fieldAliases: Record<string, string[]> = {
                valor: ['valor', 'faturamento', 'valor total', 'total venda', 'valor venda', 'preco', 'preço', 'price', 'total'],
                receita: ['receita', 'margem', 'lucro', 'markup', 'comissão', 'comissao', 'profit'],
                titulo: ['titulo', 'título', 'nome venda', 'deal', 'venda'],
                email_contato: ['email', 'e-mail'],
                cpf: ['cpf', 'documento'],
                telefone: ['telefone', 'celular', 'phone', 'tel', 'whatsapp'],
                nome_contato: ['pagante', 'nome contato', 'nome cliente', 'cliente', 'comprador'],
                data_viagem_inicio: ['data inicio', 'data início', 'inicio viagem', 'início viagem', 'check-in', 'checkin', 'ida'],
                data_viagem_fim: ['data fim', 'data final', 'fim viagem', 'check-out', 'checkout', 'volta'],
                passageiros: ['passageiro', 'viajante', 'pax', 'traveler'],
                produtos: ['produto', 'serviço', 'servico', 'item', 'product'],
                fornecedores: ['fornecedor', 'supplier', 'operador', 'operadora'],
                consultor: ['consultor', 'vendedor', 'assessor', 'responsavel', 'responsável'],
            }

            const initialMapping: Mapping = {}
            DEAL_FIELDS.forEach(field => {
                const match = sheetHeaders.find(h => {
                    const hl = h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const fl = field.label.toLowerCase()
                    const fk = field.key.toLowerCase()
                    // Exact match
                    if (hl === fl || hl === fk) return true
                    // Substring match
                    if (hl.includes(fl) || fl.includes(hl)) return true
                    if (fk.length > 3 && hl.includes(fk)) return true
                    // Alias keywords match
                    const aliases = fieldAliases[field.key] || []
                    return aliases.some(alias => hl.includes(alias))
                })
                if (match) initialMapping[field.key] = match
            })
            setMapping(initialMapping)
            setStep('mapping')
        }
        reader.readAsBinaryString(file)
    }

    // Parse Brazilian number formats: "R$ 64.918,00", "64.918,00", "5.747,44", "64918", etc.
    const parseBRNumber = (value: unknown): number => {
        if (value === null || value === undefined) return 0
        if (typeof value === 'number') return isNaN(value) ? 0 : value

        let str = String(value).trim()
        // Remove currency symbol and whitespace
        str = str.replace(/^R\$\s*/i, '').trim()
        if (!str) return 0

        const hasComma = str.includes(',')
        const hasDot = str.includes('.')

        if (hasComma && hasDot) {
            // Both: determine order to detect format
            if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
                // Comma after dot → BR: "64.918,00" → remove dots, comma→dot
                str = str.replace(/\./g, '').replace(',', '.')
            } else {
                // Dot after comma → US: "64,918.00" → remove commas
                str = str.replace(/,/g, '')
            }
        } else if (hasComma) {
            // Only comma → BR decimal: "5747,44" → comma→dot
            str = str.replace(',', '.')
        }
        // Only dot or no separator → already valid for Number()

        const num = Number(str)
        return isNaN(num) ? 0 : num
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

        // 1. Try exact substring match (handles "Daniele Adamo" → "Daniele Adamo")
        const { data } = await supabase
            .from('profiles')
            .select('id')
            .or(`nome.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
            .limit(1)
        if (data && data.length > 0) return data[0].id

        // 2. Fallback: match ALL words individually (handles "Tiago Abdul" → "Tiago de Mello Abdul Hak")
        const words = trimmed.split(/\s+/).filter(w => w.length >= 3)
        if (words.length >= 2) {
            let query = supabase.from('profiles').select('id')
            for (const word of words) {
                query = query.ilike('nome', `%${word}%`)
            }
            const { data: wordMatch } = await query.limit(1)
            if (wordMatch && wordMatch.length > 0) return wordMatch[0].id
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
        setImportedCards([])

        const batchId = `import-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`
        let successCount = 0
        let skippedCount = 0
        const errors: string[] = []
        const createdCards: { id: string; titulo: string; valor: number }[] = []

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

                    const excelDateToISO = (serial: unknown): string | null => {
                        if (!serial) return null
                        if (typeof serial === 'string') {
                            // DD/MM/YYYY or D/M/YYYY (Brazilian format) → YYYY-MM-DD
                            const brMatch = serial.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
                            if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`
                            // Already YYYY-MM-DD
                            if (/^\d{4}-\d{2}-\d{2}/.test(serial)) return serial.slice(0, 10)
                            return serial
                        }
                        const serialNum = Number(serial)
                        if (!isNaN(serialNum)) {
                            const date = new Date((serialNum - 25569) * 86400 * 1000)
                            return date.toISOString().split('T')[0]
                        }
                        return null
                    }

                    // 3. Resolve Consultor
                    const consultorId = await resolveConsultor(row['consultor'] as string | null)

                    const valorTotal = parseBRNumber(row['valor'])
                    const receita = parseBRNumber(row['receita'])
                    console.log(`[Import] Row ${i + 2}: valor raw="${row['valor']}" (${typeof row['valor']}) → ${valorTotal}, receita raw="${row['receita']}" (${typeof row['receita']}) → ${receita}`)
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
                            lote_importacao: batchId,
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

                    createdCards.push({
                        id: cardId,
                        titulo: String(row['titulo'] || ''),
                        valor: valorTotal,
                    })
                    successCount++

                } catch (err: unknown) {
                    skippedCount++
                    const e = err as Record<string, string>
                    const errorMsg = e.details || e.message || JSON.stringify(err)
                    errors.push(`Linha ${i + 2}: Erro ao criar venda - ${errorMsg}`)
                }
            }

            setImportResults({ success: successCount, skipped: skippedCount, errors })
            setImportedCards(createdCards)
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
        setImportedCards([])
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
                            {fileData.length > 0 && (
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                    <h4 className="text-xs font-medium text-slate-500 mb-2">Preview da linha 1</h4>
                                    {DEAL_FIELDS.map(field => {
                                        const header = mapping[field.key]
                                        const value = header ? fileData[0][header] : null
                                        const isEmpty = !value && value !== 0
                                        const isNumeric = field.key === 'valor' || field.key === 'receita'
                                        const parsedNum = isNumeric && !isEmpty ? parseBRNumber(value) : null
                                        return (
                                            <div key={field.key} className="flex justify-between text-sm py-0.5">
                                                <span className="text-slate-600">{field.label}</span>
                                                <span className={isEmpty ? 'text-red-400 italic text-xs' : 'text-slate-900 font-medium'}>
                                                    {isEmpty ? '(vazio)' : isNumeric && parsedNum !== null
                                                        ? `${parsedNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (raw: ${String(value)})`
                                                        : String(value)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                            <div className="flex justify-between pt-4">
                                <Button variant="ghost" onClick={reset}>Voltar</Button>
                                <Button onClick={handleImport} disabled={isImporting}>
                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                                    Importar {fileData.length} linhas
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

                            {importedCards.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-slate-700 mb-2">Cards importados</h4>
                                    <div className="max-h-[200px] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                                        {importedCards.map((card) => (
                                            <a
                                                key={card.id}
                                                href={`/cards/${card.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 transition-colors group"
                                            >
                                                <span className="text-sm text-slate-700 truncate">{card.titulo}</span>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {card.valor > 0 && (
                                                        <span className="text-xs text-slate-500">
                                                            {card.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                        </span>
                                                    )}
                                                    <ExternalLink className="h-3 w-3 text-slate-400 group-hover:text-indigo-500" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {importResults.errors.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-red-700 mb-2">Erros</h4>
                                    <div className="max-h-[150px] overflow-y-auto p-3 bg-red-50 border border-red-100 rounded text-xs font-mono text-red-700">
                                        {importResults.errors.map((err, i) => <div key={i}>{err}</div>)}
                                    </div>
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
