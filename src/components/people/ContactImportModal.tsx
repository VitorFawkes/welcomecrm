import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload, Check, AlertCircle, Loader2, ChevronRight, ArrowLeft, X, AlertTriangle, Eye } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '../../contexts/AuthContext'

interface ContactImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface Mapping {
    [key: string]: string
}

type RowData = Record<string, unknown>

const CRM_FIELDS = [
    { key: 'nome', label: 'Nome Completo', required: true },
    { key: 'cpf', label: 'CPF', required: false },
    { key: 'data_nascimento', label: 'Data de Nascimento', required: false },
    { key: 'rg', label: 'RG', required: false },
    { key: 'email', label: 'E-mail', required: false },
    { key: 'telefone', label: 'Celular/Telefone', required: false },
    { key: 'cep', label: 'CEP', required: false },
    { key: 'endereco', label: 'Endereço (rua)', required: false },
    { key: 'numero', label: 'Número', required: false },
    { key: 'complemento', label: 'Complemento', required: false },
    { key: 'bairro', label: 'Bairro', required: false },
    { key: 'cidade', label: 'Cidade', required: false },
    { key: 'uf', label: 'UF / Estado', required: false },
    { key: 'pais', label: 'País', required: false },
    { key: 'sexo', label: 'Sexo', required: false },
    { key: 'tipo_cliente', label: 'Tipo (PF/PJ)', required: false },
    { key: 'passaporte', label: 'Número Passaporte', required: false },
    { key: 'passaporte_validade', label: 'Validade Passaporte', required: false },
    { key: 'observacoes', label: 'Observações', required: false },
    { key: 'tags', label: 'Tags (separadas por vírgula)', required: false },
    { key: 'cadastrado_em', label: 'Data Cadastro Original', required: false },
    { key: 'primeira_venda', label: 'Primeira Venda', required: false },
    { key: 'ultima_venda', label: 'Última Venda', required: false },
    { key: 'ultimo_retorno', label: 'Último Retorno', required: false },
]

const fieldAliases: Record<string, string[]> = {
    nome: ['nome', 'name', 'nome completo', 'full name'],
    cpf: ['cpf', 'documento', 'cpf/cnpj', 'cnpj'],
    data_nascimento: ['nascimento', 'data nascimento', 'data de nascimento', 'fundacao', 'fundação', 'nascimento (fundação)', 'nascimento (fundacao)', 'birthday', 'aniversario', 'aniversário', 'birth date'],
    rg: ['rg', 'identidade', 'registro geral'],
    email: ['email', 'e-mail', 'mail', 'correio'],
    telefone: ['celular', 'telefone', 'phone', 'tel', 'whatsapp', 'fone', 'mobile'],
    cep: ['cep', 'zip', 'codigo postal', 'código postal'],
    endereco: ['endereco', 'endereço', 'rua', 'logradouro', 'address'],
    numero: ['numero', 'número', 'nro', 'num'],
    complemento: ['complemento', 'compl'],
    bairro: ['bairro', 'neighborhood'],
    cidade: ['cidade', 'city', 'municipio', 'município'],
    uf: ['uf', 'estado', 'state'],
    pais: ['pais', 'país', 'country'],
    sexo: ['sexo', 'genero', 'gênero', 'gender'],
    tipo_cliente: ['tipo', 'tipo cliente', 'tipo de cliente', 'pf/pj', 'person type'],
    passaporte: ['passaporte', 'passport', 'numero passaporte', 'número passaporte'],
    passaporte_validade: ['validade passaporte', 'passport expiry', 'vencimento passaporte', 'validade do passaporte'],
    observacoes: ['observacoes', 'observações', 'obs', 'notas', 'notes'],
    tags: ['tags', 'categorias'],
    cadastrado_em: ['cadastrado em', 'data cadastro', 'registration date', 'data de cadastro', 'created at'],
    primeira_venda: ['primeira venda', 'first sale'],
    ultima_venda: ['ultima venda', 'última venda', 'last sale'],
    ultimo_retorno: ['ultimo retorno', 'último retorno', 'last return'],
}

/** Fix UTF-8 double-encoding (mojibake): "Ã¡" → "á", "Ã§" → "ç" */
function fixMojibake(str: string): string {
    try {
        const bytes = new Uint8Array([...str].map(c => c.charCodeAt(0)))
        if ([...str].some(c => c.charCodeAt(0) > 255)) return str
        const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
        return decoded !== str ? decoded : str
    } catch {
        return str
    }
}

function excelDateToISO(serial: unknown): string | null {
    if (!serial) return null
    // Tenta numérico primeiro (Excel serial dates — funciona para string e number)
    const asNum = typeof serial === 'string' ? Number(serial) : (typeof serial === 'number' ? serial : NaN)
    if (!isNaN(asNum) && asNum > 1000 && asNum < 100000) {
        const date = new Date((asNum - 25569) * 86400 * 1000)
        return date.toISOString().split('T')[0]
    }
    if (typeof serial === 'string') {
        const brMatch = serial.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
        if (brMatch) return `${brMatch[3]}-${brMatch[2].padStart(2, '0')}-${brMatch[1].padStart(2, '0')}`
        if (/^\d{4}-\d{2}-\d{2}/.test(serial)) return serial.slice(0, 10)
    }
    return null
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function splitName(fullName: string): { nome: string; sobrenome: string | null } {
    const parts = fullName.trim().split(/\s+/)
    if (parts.length <= 1) return { nome: parts[0] || '', sobrenome: null }
    return { nome: parts[0], sobrenome: parts.slice(1).join(' ') }
}

interface ParsedContact {
    nome: string
    sobrenome: string | null
    cpf: string | null
    _normalizedCpf: string | null
    rg: string | null
    email: string | null
    telefone: string | null
    data_nascimento: string | null
    passaporte: string | null
    passaporte_validade: string | null
    endereco: Record<string, string> | null
    observacoes: string | null
    tags: string[] | null
    sexo: string | null
    tipo_cliente: string | null
    data_cadastro_original: string | null
    primeira_venda_data: string | null
    ultima_venda_data: string | null
    ultimo_retorno_data: string | null
}

interface PreviewStats {
    toImport: number
    dupCpf: number
    dupEmail: number
    dupName: number
    noName: number
    dupInFile: number
    total: number
}

export default function ContactImportModal({ isOpen, onClose, onSuccess }: ContactImportModalProps) {
    const { session } = useAuth()
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'results'>('upload')
    const [fileData, setFileData] = useState<RowData[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<Mapping>({})
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Preview & import state
    const [previewStats, setPreviewStats] = useState<PreviewStats | null>(null)
    const [contactsToInsert, setContactsToInsert] = useState<ParsedContact[]>([])
    const [batchId, setBatchId] = useState('')
    const [importResults, setImportResults] = useState<{
        success: number; dupCpf: number; dupEmail: number; errors: string[]
    }>({ success: 0, dupCpf: 0, dupEmail: 0, errors: [] })
    const [progress, setProgress] = useState({ current: 0, total: 0, startTime: 0 })
    const [analysisProgress, setAnalysisProgress] = useState<{ phase: string; current: number; total: number } | null>(null)
    const abortRef = useRef(false)

    const currentUserId = session?.user?.id

    const handleDownloadTemplate = () => {
        const template = [
            {
                Nome: 'João Silva',
                CPF: '123.456.789-00',
                'Data de Nascimento': '01/01/1990',
                RG: '12.345.678-9',
                'E-mail': 'joao@exemplo.com',
                Celular: '11999999999',
                CEP: '01310-100',
                'Endereço': 'Av Paulista',
                'Número': '1000',
                Complemento: 'Sala 1',
                Bairro: 'Bela Vista',
                Cidade: 'São Paulo',
                UF: 'SP',
                'País': 'Brasil',
                Sexo: 'Masculino',
                'Tipo (PF/PJ)': 'PF',
                Passaporte: 'AA123456',
                'Validade Passaporte': '2030-12-31',
                'Observações': 'Cliente VIP',
                Tags: 'VIP, Luxo',
                'Cadastrado em': '01/01/2020',
                'Primeira Venda': '15/03/2020',
                'Última Venda': '20/12/2025',
                'Último Retorno': '10/01/2026',
            }
        ]
        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Modelo Importação')
        XLSX.writeFile(wb, 'modelo_importacao_contatos.xlsx')
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (evt) => {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer)
            const wb = XLSX.read(data, { type: 'array', codepage: 65001 })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]

            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][]
            if (rows.length === 0) {
                toast.error('O arquivo está vazio')
                return
            }

            const sheetHeaders = (rows[0] as unknown[]).map(h => {
                const raw = String(h || '').trim()
                return fixMojibake(raw)
            }).filter(h => h !== '')

            const rawData = XLSX.utils.sheet_to_json(ws) as RowData[]
            // Fix mojibake in all header keys
            const fixedData = rawData.map(row => {
                const fixed: RowData = {}
                for (const [key, value] of Object.entries(row)) {
                    fixed[fixMojibake(key)] = value
                }
                return fixed
            })

            setHeaders(sheetHeaders)
            setFileData(fixedData)

            // Auto-mapping com aliases (matching em camadas: exato → contém → parcial)
            const initialMapping: Mapping = {}
            const usedHeaders = new Set<string>()
            CRM_FIELDS.forEach(field => {
                const aliases = fieldAliases[field.key] || [field.key, field.label]
                const allAliases = [...aliases, field.label, field.key]

                // Camada 1: match exato
                let match = sheetHeaders.find(h => {
                    if (usedHeaders.has(h)) return false
                    const hl = h.toLowerCase().trim()
                    return allAliases.some(a => hl === a.toLowerCase())
                })

                // Camada 2: header contém alias (alias com 4+ chars para evitar falsos positivos)
                if (!match) {
                    match = sheetHeaders.find(h => {
                        if (usedHeaders.has(h)) return false
                        const hl = h.toLowerCase().trim()
                        return allAliases.some(a => a.length >= 4 && hl.includes(a.toLowerCase()))
                    })
                }

                if (match) {
                    initialMapping[field.key] = match
                    usedHeaders.add(match)
                }
            })
            setMapping(initialMapping)
            setStep('mapping')
        }
        reader.readAsArrayBuffer(file)
    }

    function mapRowToContact(rawRow: RowData): ParsedContact {
        const get = (key: string): string | null => {
            const header = mapping[key]
            if (!header) return null
            const val = rawRow[header]
            if (val == null || val === '') return null
            return String(val).trim()
        }

        const fullName = get('nome') || ''
        const { nome, sobrenome } = splitName(fullName)

        const cpfRaw = get('cpf')
        let normalizedCpf = cpfRaw ? cpfRaw.replace(/\D/g, '') : null
        // Excel remove zeros à esquerda: "05204520970" → "5204520970"
        if (normalizedCpf) {
            if (normalizedCpf.length === 10) normalizedCpf = normalizedCpf.padStart(11, '0')
            else if (normalizedCpf.length === 13) normalizedCpf = normalizedCpf.padStart(14, '0')
        }
        const validCpf = normalizedCpf && (normalizedCpf.length === 11 || normalizedCpf.length === 14) ? normalizedCpf : null

        const emailRaw = get('email')
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const email = emailRaw && emailRegex.test(emailRaw) ? emailRaw.toLowerCase().trim() : null

        const telefoneRaw = get('telefone')
        const telefone = telefoneRaw ? telefoneRaw.replace(/\D/g, '') : null

        // Endereço JSONB
        const endereco: Record<string, string> = {}
        const fields: [string, string][] = [
            ['cep', 'cep'], ['endereco', 'rua'], ['numero', 'numero'],
            ['complemento', 'complemento'], ['bairro', 'bairro'],
            ['cidade', 'cidade'], ['uf', 'estado'], ['pais', 'pais'],
        ]
        for (const [mappingKey, jsonKey] of fields) {
            const val = get(mappingKey)
            if (mappingKey === 'cep' && val) {
                const cepDigits = val.replace(/\D/g, '')
                // Excel remove zeros à esquerda: "07260270" → "7260270"
                endereco['cep'] = cepDigits.length === 7 ? '0' + cepDigits : cepDigits
            } else if (val) {
                endereco[jsonKey] = val
            }
        }

        const dataNascimento = excelDateToISO(get('data_nascimento'))
        const passaporteValidade = excelDateToISO(get('passaporte_validade'))

        // Tags (apenas tags reais, sem sexo)
        const tagsRaw = get('tags')
        const tags: string[] = []
        if (tagsRaw) tags.push(...tagsRaw.split(',').map(t => t.trim()).filter(Boolean))

        // Sexo → coluna própria (normalizar M/F)
        const sexoRaw = get('sexo')
        let sexo: string | null = null
        if (sexoRaw) {
            const s = sexoRaw.toLowerCase().trim()
            if (s.startsWith('m') || s === 'masculino' || s === 'male') sexo = 'Masculino'
            else if (s.startsWith('f') || s === 'feminino' || s === 'female') sexo = 'Feminino'
            else sexo = sexoRaw
        }

        // Tipo cliente → coluna própria (PF/PJ)
        const tipoRaw = get('tipo_cliente')
        let tipoCliente: string | null = null
        if (tipoRaw) {
            const t = tipoRaw.toLowerCase().trim()
            if (t.includes('fis') || t === 'pf' || t === 'pessoa física') tipoCliente = 'PF'
            else if (t.includes('jur') || t === 'pj' || t === 'pessoa jurídica') tipoCliente = 'PJ'
            else tipoCliente = tipoRaw
        }

        // Datas comerciais → colunas date próprias
        const primeiraVendaData = excelDateToISO(get('primeira_venda'))
        const ultimaVendaData = excelDateToISO(get('ultima_venda'))
        const ultimoRetornoData = excelDateToISO(get('ultimo_retorno'))
        const dataCadastroOriginal = excelDateToISO(get('cadastrado_em'))

        // Observações → SOMENTE o campo real de observações do CSV
        const obs = get('observacoes')

        return {
            nome,
            sobrenome,
            cpf: validCpf,
            _normalizedCpf: validCpf,
            rg: get('rg'),
            email,
            telefone: telefone && telefone.length >= 8 ? telefone : null,
            data_nascimento: dataNascimento,
            passaporte: get('passaporte'),
            passaporte_validade: passaporteValidade,
            endereco: Object.keys(endereco).length > 0 ? endereco : null,
            observacoes: obs || null,
            tags: tags.length > 0 ? tags : null,
            sexo,
            tipo_cliente: tipoCliente,
            data_cadastro_original: dataCadastroOriginal,
            primeira_venda_data: primeiraVendaData,
            ultima_venda_data: ultimaVendaData,
            ultimo_retorno_data: ultimoRetornoData,
        }
    }

    const handlePreview = async () => {
        const requiredMissing = CRM_FIELDS.filter(f => f.required && !mapping[f.key])
        if (requiredMissing.length > 0) {
            toast.error(`Mapeamento obrigatório ausente: ${requiredMissing.map(f => f.label).join(', ')}`)
            return
        }

        setIsImporting(true)
        setAnalysisProgress({ phase: 'Parseando contatos...', current: 0, total: fileData.length })

        try {
            // Fase 1: Parse + dedup intra-arquivo (com progresso)
            const parsed: ParsedContact[] = []
            let noNameCount = 0
            for (let i = 0; i < fileData.length; i++) {
                const contact = mapRowToContact(fileData[i])
                if (!contact.nome) {
                    noNameCount++
                    continue
                }
                parsed.push(contact)
                if (i % 1000 === 0) {
                    setAnalysisProgress({ phase: 'Parseando contatos...', current: i, total: fileData.length })
                    await sleep(0) // yield para atualizar UI
                }
            }
            setAnalysisProgress({ phase: 'Deduplicando arquivo...', current: fileData.length, total: fileData.length })

            const cpfSeen = new Map<string, number>()
            const emailSeen = new Map<string, number>()
            const nameSeen = new Map<string, number>()
            const deduped: ParsedContact[] = []
            let dupInFileCount = 0

            for (let i = 0; i < parsed.length; i++) {
                const c = parsed[i]
                if (c._normalizedCpf && cpfSeen.has(c._normalizedCpf)) {
                    dupInFileCount++
                    continue
                }
                if (c.email && emailSeen.has(c.email)) {
                    dupInFileCount++
                    continue
                }
                // Terceira camada: dedup por nome completo (só quando não tem CPF nem email)
                if (!c._normalizedCpf && !c.email && c.sobrenome) {
                    const fullName = (c.nome + ' ' + c.sobrenome).toLowerCase().trim()
                    if (nameSeen.has(fullName)) {
                        dupInFileCount++
                        continue
                    }
                    nameSeen.set(fullName, i)
                }
                if (c._normalizedCpf) cpfSeen.set(c._normalizedCpf, i)
                if (c.email) emailSeen.set(c.email, i)
                deduped.push(c)
            }

            // Fase 2: Dedup contra banco (com progresso)
            setAnalysisProgress({ phase: 'Verificando CPFs no banco...', current: 0, total: 0 })
            const existingCpfs = new Set<string>()
            const PAGE_SIZE = 1000
            let offset = 0
            let cpfPages = 0
            while (true) {
                const { data } = await supabase
                    .from('contatos')
                    .select('cpf_normalizado')
                    .not('cpf_normalizado', 'is', null)
                    .range(offset, offset + PAGE_SIZE - 1)
                if (!data || data.length === 0) break
                data.forEach((r: { cpf_normalizado: string | null }) => {
                    if (r.cpf_normalizado) existingCpfs.add(r.cpf_normalizado)
                })
                cpfPages++
                setAnalysisProgress({ phase: 'Verificando CPFs no banco...', current: existingCpfs.size, total: 0 })
                if (data.length < PAGE_SIZE) break
                offset += PAGE_SIZE
            }

            setAnalysisProgress({ phase: 'Verificando emails no banco...', current: 0, total: 0 })
            const existingEmails = new Set<string>()
            offset = 0
            while (true) {
                const { data } = await supabase
                    .from('contatos')
                    .select('email')
                    .not('email', 'is', null)
                    .range(offset, offset + PAGE_SIZE - 1)
                if (!data || data.length === 0) break
                data.forEach((r: { email: string | null }) => {
                    if (r.email) existingEmails.add(r.email.toLowerCase())
                })
                setAnalysisProgress({ phase: 'Verificando emails no banco...', current: existingEmails.size, total: 0 })
                if (data.length < PAGE_SIZE) break
                offset += PAGE_SIZE
            }
            // Fase 3: Fetch nomes existentes no banco (para contatos sem CPF/email)
            setAnalysisProgress({ phase: 'Verificando nomes no banco...', current: 0, total: 0 })
            const existingNames = new Set<string>()
            offset = 0
            while (true) {
                const { data } = await supabase
                    .from('contatos')
                    .select('nome,sobrenome')
                    .not('sobrenome', 'is', null)
                    .range(offset, offset + PAGE_SIZE - 1)
                if (!data || data.length === 0) break
                data.forEach((r: { nome: string; sobrenome: string | null }) => {
                    if (r.sobrenome && r.sobrenome.trim()) {
                        existingNames.add((r.nome + ' ' + r.sobrenome).toLowerCase().trim())
                    }
                })
                setAnalysisProgress({ phase: 'Verificando nomes no banco...', current: existingNames.size, total: 0 })
                if (data.length < PAGE_SIZE) break
                offset += PAGE_SIZE
            }

            setAnalysisProgress({ phase: 'Finalizando análise...', current: 0, total: 0 })

            let dupCpfCount = 0
            let dupEmailCount = 0
            let dupNameCount = 0
            const toInsert: ParsedContact[] = []

            for (const contact of deduped) {
                if (contact._normalizedCpf && existingCpfs.has(contact._normalizedCpf)) {
                    dupCpfCount++
                    continue
                }
                if (contact.email && existingEmails.has(contact.email)) {
                    dupEmailCount++
                    continue
                }
                // Terceira camada: dedup por nome completo contra banco (só sem CPF/email)
                if (!contact._normalizedCpf && !contact.email && contact.sobrenome) {
                    const fullName = (contact.nome + ' ' + contact.sobrenome).toLowerCase().trim()
                    if (existingNames.has(fullName)) {
                        dupNameCount++
                        continue
                    }
                }
                toInsert.push(contact)
            }

            const newBatchId = `import-contacts-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}`
            setBatchId(newBatchId)
            setContactsToInsert(toInsert)
            setPreviewStats({
                toImport: toInsert.length,
                dupCpf: dupCpfCount,
                dupEmail: dupEmailCount,
                dupName: dupNameCount,
                noName: noNameCount,
                dupInFile: dupInFileCount,
                total: fileData.length,
            })
            setStep('preview')
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido'
            toast.error(`Erro na análise: ${message}`)
            setStep('mapping')
        } finally {
            setIsImporting(false)
            setAnalysisProgress(null)
        }
    }

    const handleImport = async () => {
        setIsImporting(true)
        setStep('importing')
        abortRef.current = false

        let successCount = 0
        const errors: string[] = []
        const MAX_ERRORS = 200
        const CHUNK_SIZE = 100
        const CHUNK_DELAY = 300

        const startTime = Date.now()
        setProgress({ current: 0, total: contactsToInsert.length, startTime })

        try {
            for (let i = 0; i < contactsToInsert.length; i += CHUNK_SIZE) {
                if (abortRef.current) {
                    errors.push(`Importação cancelada pelo usuário na linha ${i + 1}`)
                    break
                }

                const chunk = contactsToInsert.slice(i, i + CHUNK_SIZE)
                const insertData = chunk.map(c => {
                    const { _normalizedCpf, ...rest } = c
                    void _normalizedCpf
                    return {
                        ...rest,
                        origem: 'importacao' as const,
                        origem_detalhe: batchId,
                        created_by: currentUserId || null,
                    }
                })

                const { error } = await supabase.from('contatos').insert(insertData)

                if (error) {
                    // Fallback: insert 1-a-1
                    for (let j = 0; j < insertData.length; j++) {
                        const single = insertData[j]
                        const { error: singleErr } = await supabase.from('contatos').insert(single)
                        if (singleErr) {
                            if (errors.length < MAX_ERRORS) {
                                errors.push(`${single.nome} ${single.sobrenome || ''}: ${singleErr.message}`)
                            }
                        } else {
                            successCount++
                        }
                    }
                } else {
                    successCount += chunk.length
                }

                setProgress({ current: Math.min(i + CHUNK_SIZE, contactsToInsert.length), total: contactsToInsert.length, startTime })

                if (i + CHUNK_SIZE < contactsToInsert.length) {
                    await sleep(CHUNK_DELAY)
                }
            }

            // Fase 4: Popular contato_meios com telefones E emails
            if (successCount > 0 && batchId) {
                try {
                    let meiosOffset = 0
                    while (true) {
                        const { data: recentContacts } = await supabase
                            .from('contatos')
                            .select('id, telefone, email')
                            .eq('origem_detalhe', batchId)
                            .range(meiosOffset, meiosOffset + 500 - 1)

                        if (!recentContacts || recentContacts.length === 0) break

                        const meiosToInsert: { contato_id: string; tipo: string; valor: string; is_principal: boolean; origem: string }[] = []

                        for (const c of recentContacts) {
                            if (c.telefone) {
                                meiosToInsert.push({
                                    contato_id: c.id,
                                    tipo: 'telefone',
                                    valor: c.telefone,
                                    is_principal: true,
                                    origem: 'importacao',
                                })
                            }
                            if (c.email) {
                                meiosToInsert.push({
                                    contato_id: c.id,
                                    tipo: 'email',
                                    valor: c.email,
                                    is_principal: true,
                                    origem: 'importacao',
                                })
                            }
                        }

                        if (meiosToInsert.length > 0) {
                            // ON CONFLICT handled by DB unique constraint (tipo, valor_normalizado)
                            await supabase.from('contato_meios').insert(meiosToInsert)
                        }

                        if (recentContacts.length < 500) break
                        meiosOffset += 500
                    }
                } catch {
                    // Não-crítico: meios podem ser populados depois
                }
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Erro desconhecido'
            errors.push(`ERRO FATAL: ${message}`)
        } finally {
            setImportResults({
                success: successCount,
                dupCpf: previewStats?.dupCpf || 0,
                dupEmail: previewStats?.dupEmail || 0,
                errors,
            })
            setStep('results')
            setIsImporting(false)
        }
    }

    const reset = () => {
        setStep('upload')
        setFileData([])
        setHeaders([])
        setMapping({})
        setPreviewStats(null)
        setContactsToInsert([])
        setImportResults({ success: 0, dupCpf: 0, dupEmail: 0, errors: [] })
        setProgress({ current: 0, total: 0, startTime: 0 })
        setAnalysisProgress(null)
        abortRef.current = false
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isImporting) { onClose() } }}>
            <DialogContent className="max-w-2xl bg-white border border-slate-200 shadow-lg">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-semibold tracking-tight text-slate-900">Importar Contatos</DialogTitle>
                    <DialogDescription>
                        Importe contatos via Excel ou CSV com deduplicação automática por CPF.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {/* STEP: Upload */}
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 transition-colors hover:bg-slate-100/50">
                            <Upload className="h-12 w-12 text-slate-400 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">Selecione seu arquivo</h3>
                            <p className="text-sm text-slate-500 mb-6 text-center">
                                Arraste ou clique para selecionar um arquivo .xlsx, .xls ou .csv
                            </p>

                            <div className="flex gap-4">
                                <Button
                                    variant="outline"
                                    onClick={handleDownloadTemplate}
                                    className="flex items-center gap-2"
                                >
                                    <Download className="h-4 w-4" />
                                    Baixar Modelo
                                </Button>
                                <Button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                    Selecionar Arquivo
                                </Button>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept=".xlsx, .xls, .csv"
                                onChange={handleFileUpload}
                            />
                        </div>
                    )}

                    {/* STEP: Mapping */}
                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-700">
                                    <p className="font-medium">{fileData.length.toLocaleString('pt-BR')} linhas encontradas</p>
                                    <p>Relacione as colunas do seu arquivo com os campos do sistema.</p>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                <table className="w-full text-sm">
                                    <thead className="sticky top-0 bg-white border-b border-slate-200">
                                        <tr>
                                            <th className="text-left py-3 font-semibold text-slate-700">Campo CRM</th>
                                            <th className="text-left py-3 font-semibold text-slate-700">Coluna no Arquivo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {CRM_FIELDS.map(field => (
                                            <tr key={field.key}>
                                                <td className="py-3 font-medium text-slate-900">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </td>
                                                <td className="py-3">
                                                    <select
                                                        value={mapping[field.key] || ''}
                                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                        className="w-full h-9 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                                    >
                                                        <option value="">— Não mapear —</option>
                                                        {headers.map((h: string) => (
                                                            <option key={h} value={h}>{h}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Barra de progresso da análise */}
                            {analysisProgress && (
                                <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 text-indigo-600 animate-spin" />
                                        <span className="text-sm font-medium text-indigo-900">{analysisProgress.phase}</span>
                                    </div>
                                    {analysisProgress.total > 0 ? (
                                        <>
                                            <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                                                    style={{ width: `${Math.round((analysisProgress.current / analysisProgress.total) * 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-xs text-indigo-600">
                                                <span>{analysisProgress.current.toLocaleString('pt-BR')} / {analysisProgress.total.toLocaleString('pt-BR')}</span>
                                                <span>{Math.round((analysisProgress.current / analysisProgress.total) * 100)}%</span>
                                            </div>
                                        </>
                                    ) : analysisProgress.current > 0 ? (
                                        <div className="text-xs text-indigo-600">
                                            {analysisProgress.current.toLocaleString('pt-BR')} registros verificados
                                        </div>
                                    ) : null}
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <Button variant="ghost" onClick={reset} disabled={isImporting}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Trocar Arquivo
                                </Button>
                                <Button onClick={handlePreview} className="gap-2" disabled={isImporting}>
                                    {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                    Analisar {fileData.length.toLocaleString('pt-BR')} Contatos
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP: Preview */}
                    {step === 'preview' && previewStats && (
                        <div className="space-y-6">
                            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg">
                                <h3 className="font-semibold text-indigo-900 mb-3">Resumo da Análise</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                                        <div className="text-xl font-bold text-slate-900">{previewStats.total.toLocaleString('pt-BR')}</div>
                                        <div className="text-xs text-slate-500">Linhas no arquivo</div>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                        <div className="text-xl font-bold text-green-600">{previewStats.toImport.toLocaleString('pt-BR')}</div>
                                        <div className="text-xs text-green-800">Serão importados</div>
                                    </div>
                                    {previewStats.dupCpf > 0 && (
                                        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="text-xl font-bold text-blue-600">{previewStats.dupCpf.toLocaleString('pt-BR')}</div>
                                            <div className="text-xs text-blue-800">CPF já existe (pulados)</div>
                                        </div>
                                    )}
                                    {previewStats.dupEmail > 0 && (
                                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                                            <div className="text-xl font-bold text-amber-600">{previewStats.dupEmail.toLocaleString('pt-BR')}</div>
                                            <div className="text-xs text-amber-800">Email já existe (pulados)</div>
                                        </div>
                                    )}
                                    {previewStats.dupName > 0 && (
                                        <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                            <div className="text-xl font-bold text-purple-600">{previewStats.dupName.toLocaleString('pt-BR')}</div>
                                            <div className="text-xs text-purple-800">Nome já existe (pulados)</div>
                                        </div>
                                    )}
                                    {previewStats.dupInFile > 0 && (
                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="text-xl font-bold text-slate-600">{previewStats.dupInFile.toLocaleString('pt-BR')}</div>
                                            <div className="text-xs text-slate-500">Duplicados no arquivo</div>
                                        </div>
                                    )}
                                    {previewStats.noName > 0 && (
                                        <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                            <div className="text-xl font-bold text-red-600">{previewStats.noName.toLocaleString('pt-BR')}</div>
                                            <div className="text-xs text-red-800">Sem nome (ignorados)</div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {previewStats.toImport === 0 ? (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <span>Nenhum contato novo para importar. Todos já existem na base.</span>
                                </div>
                            ) : (
                                <div className="text-sm text-slate-500">
                                    Tempo estimado: ~{Math.ceil(previewStats.toImport / 100 * 0.4)} segundos
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <Button variant="ghost" onClick={() => setStep('mapping')}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Voltar ao Mapeamento
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    className="gap-2"
                                    disabled={previewStats.toImport === 0}
                                >
                                    <Check className="h-4 w-4" />
                                    Importar {previewStats.toImport.toLocaleString('pt-BR')} Contatos
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />

                            <div>
                                <p className="text-2xl font-bold text-slate-900">
                                    {progress.current.toLocaleString('pt-BR')} <span className="text-slate-400 font-normal text-lg">/ {progress.total.toLocaleString('pt-BR')}</span>
                                </p>
                                <p className="text-sm text-slate-500 mt-1">Importando contatos...</p>
                            </div>

                            <div className="w-full max-w-md">
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-300"
                                        style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-slate-400">
                                    <span>{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</span>
                                    <span>
                                        {(() => {
                                            if (progress.current < 5 || !progress.startTime) return 'Calculando...'
                                            const elapsed = (Date.now() - progress.startTime) / 1000
                                            const perRow = elapsed / progress.current
                                            const remaining = perRow * (progress.total - progress.current)
                                            if (remaining < 60) return `~${Math.ceil(remaining)}s restantes`
                                            return `~${Math.ceil(remaining / 60)}min restantes`
                                        })()}
                                    </span>
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { abortRef.current = true }}
                                className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
                            >
                                <X className="h-4 w-4" />
                                Cancelar Importação
                            </Button>
                        </div>
                    )}

                    {/* STEP: Results */}
                    {step === 'results' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">{importResults.success.toLocaleString('pt-BR')}</div>
                                    <div className="text-sm text-green-800">Importados</div>
                                </div>
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600">{importResults.dupCpf.toLocaleString('pt-BR')}</div>
                                    <div className="text-sm text-blue-800">CPF duplicado (pulados)</div>
                                </div>
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-amber-600">{importResults.dupEmail.toLocaleString('pt-BR')}</div>
                                    <div className="text-sm text-amber-800">Email duplicado (pulados)</div>
                                </div>
                                <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                                    <div className="text-sm text-red-800">Erros</div>
                                </div>
                            </div>

                            {importResults.errors.some(e => e.includes('ERRO FATAL') || e.includes('cancelada')) && (
                                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                    <span>Importação interrompida. Os contatos acima foram importados antes da interrupção.</span>
                                </div>
                            )}

                            {importResults.errors.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-medium text-red-700 mb-2">Erros ({importResults.errors.length})</h4>
                                    <div className="max-h-[150px] overflow-y-auto p-3 bg-red-50 border border-red-100 rounded-lg text-xs font-mono text-red-700">
                                        {importResults.errors.map((err, i) => <div key={i}>{err}</div>)}
                                    </div>
                                </div>
                            )}

                            <Button onClick={() => { onSuccess(); onClose(); reset() }} className="w-full">
                                Concluir
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
