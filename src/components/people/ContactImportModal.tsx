import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Download, Upload, Check, AlertCircle, Loader2, ChevronRight, ArrowLeft } from 'lucide-react'
import { Button } from '../ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

interface ContactImportModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

interface Mapping {
    [key: string]: string
}

const CRM_FIELDS = [
    { key: 'nome', label: 'Nome', required: true },
    { key: 'sobrenome', label: 'Sobrenome', required: false },
    { key: 'email', label: 'Email', required: false },
    { key: 'telefone', label: 'Telefone', required: false },
    { key: 'cpf', label: 'CPF', required: false },
    { key: 'data_nascimento', label: 'Data de Nascimento', required: false },
    { key: 'passaporte', label: 'Passaporte', required: false },
    { key: 'tipo_pessoa', label: 'Tipo (adulto/crianca)', required: false },
    { key: 'tags', label: 'Tags (separadas por vírgula)', required: false },
    { key: 'observacoes', label: 'Observações', required: false }
]

export default function ContactImportModal({ isOpen, onClose, onSuccess }: ContactImportModalProps) {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing'>('upload')
    const [fileData, setFileData] = useState<any[]>([])
    const [headers, setHeaders] = useState<string[]>([])
    const [mapping, setMapping] = useState<Mapping>({})
    const [isImporting, setIsImporting] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDownloadTemplate = () => {
        const template = [
            {
                Nome: 'João',
                Sobrenome: 'Silva',
                Email: 'joao@exemplo.com',
                Telefone: '11999999999',
                CPF: '123.456.789-00',
                'Data de Nascimento': '1990-01-01',
                Passaporte: 'AA123456',
                Tipo: 'adulto',
                Tags: 'VIP, Luxo',
                Observações: 'Cliente VIP'
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
            const bstr = evt.target?.result
            const wb = XLSX.read(bstr, { type: 'binary' })
            const wsname = wb.SheetNames[0]
            const ws = wb.Sheets[wsname]

            // Get all data including headers reliably
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
            CRM_FIELDS.forEach(field => {
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

    const handleImport = async () => {
        const requiredMissing = CRM_FIELDS.filter(f => f.required && !mapping[f.key])
        if (requiredMissing.length > 0) {
            toast.error(`Mapeamento obrigatório ausente: ${requiredMissing.map(f => f.label).join(', ')}`)
            return
        }

        setIsImporting(true)
        setStep('importing')

        try {
            const contactsToUpsert = fileData.map((row: any) => {
                const contact: any = {}
                CRM_FIELDS.forEach(field => {
                    if (mapping[field.key]) {
                        const value = row[mapping[field.key]]
                        const stringValue = String(value || '').trim()

                        if (field.key === 'email') {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                            contact[field.key] = emailRegex.test(stringValue) ? stringValue : null
                        } else if (field.key === 'tags' && typeof value === 'string') {
                            contact[field.key] = value.split(',').map(t => t.trim())
                        } else {
                            contact[field.key] = value
                        }
                    }
                })
                // Default value for tipo_pessoa if not provided
                if (!contact.tipo_pessoa) contact.tipo_pessoa = 'adulto'
                return contact
            })

            // Deduplicate by email to avoid "ON CONFLICT DO UPDATE command cannot affect row a second time"
            // Postgres doesn't allow updating the same row twice in one batch.
            const uniqueContacts = Array.from(
                contactsToUpsert.reduce((map, contact) => {
                    if (contact.email) {
                        map.set(contact.email.toLowerCase().trim(), contact)
                    } else {
                        // If no email, just keep it (though upsert might fail if it's the conflict target)
                        // Using unique ID for map key if email is missing to keep them
                        map.set(Math.random().toString(), contact)
                    }
                    return map
                }, new Map<string, any>()).values()
            )

            // Supabase upsert based on email (unique constraint)
            const { error } = await supabase
                .from('contatos')
                .upsert(uniqueContacts, {
                    onConflict: 'email',
                    ignoreDuplicates: false
                })

            if (error) throw error

            toast.success(`${contactsToUpsert.length} contatos importados com sucesso!`)
            onSuccess()
            onClose()
            reset()
        } catch (error: any) {
            console.error('Import error:', error)
            toast.error(`Erro na importação: ${error.message}`)
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
                    <DialogTitle className="text-2xl font-semibold text-slate-900">Importar Contatos</DialogTitle>
                    <DialogDescription>
                        Siga os passos abaixo para importar seus contatos via Excel ou CSV.
                    </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 transition-colors hover:bg-slate-50">
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

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                <p className="text-sm text-blue-700">
                                    Relacione as colunas do seu arquivo com os campos do nosso sistema.
                                </p>
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
                                                <td className="py-4 font-medium text-slate-900">
                                                    {field.label} {field.required && <span className="text-red-500">*</span>}
                                                </td>
                                                <td className="py-4">
                                                    <select
                                                        value={mapping[field.key] || ''}
                                                        onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                                                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                                    >
                                                        <option value="">Selecione uma coluna...</option>
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

                            <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                                <Button variant="ghost" onClick={reset} disabled={isImporting}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Trocar Arquivo
                                </Button>
                                <Button onClick={handleImport} className="gap-2" disabled={isImporting}>
                                    <Check className="h-4 w-4" />
                                    Importar {fileData.length} Contatos
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">Importando seus dados...</h3>
                            <p className="text-sm text-slate-500">
                                Isso pode levar alguns segundos dependendo da quantidade de registros.
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
