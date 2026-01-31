import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '../ui/Button'
import { toast } from 'sonner'
import type { LeadCard } from '../../hooks/useLeadsQuery'
import { format } from 'date-fns'

interface LeadsExportProps {
    leads: LeadCard[]
    selectedIds?: string[]
}

export default function LeadsExport({ leads, selectedIds }: LeadsExportProps) {
    const [isExporting, setIsExporting] = useState(false)

    const handleExport = async () => {
        setIsExporting(true)

        try {
            // Filter leads if selection exists
            const leadsToExport = selectedIds?.length
                ? leads.filter(l => selectedIds.includes(l.id!))
                : leads

            if (leadsToExport.length === 0) {
                toast.error('Nenhum lead para exportar')
                return
            }

            // Define CSV headers
            const headers = [
                'Título',
                'Cliente',
                'Email',
                'Telefone',
                'Etapa',
                'Responsável',
                'Valor Estimado',
                'Prioridade',
                'Status',
                'Origem',
                'Data Criação',
                'Última Atualização'
            ]

            // Map leads to CSV rows
            const rows = leadsToExport.map(lead => [
                escapeCSV(lead.titulo || ''),
                escapeCSV(lead.pessoa_nome || ''),
                escapeCSV(lead.pessoa_email || ''),
                escapeCSV(lead.pessoa_telefone || ''),
                escapeCSV(lead.etapa_nome || ''),
                escapeCSV(lead.dono_atual_nome || ''),
                lead.valor_estimado?.toString() || '0',
                escapeCSV(lead.prioridade || ''),
                escapeCSV(lead.status_comercial || ''),
                escapeCSV(lead.origem || ''),
                lead.created_at ? format(new Date(lead.created_at), 'dd/MM/yyyy HH:mm') : '',
                lead.updated_at ? format(new Date(lead.updated_at), 'dd/MM/yyyy HH:mm') : ''
            ])

            // Build CSV content
            const csvContent = [
                headers.join(';'),
                ...rows.map(row => row.join(';'))
            ].join('\n')

            // Add BOM for Excel compatibility with UTF-8
            const BOM = '\uFEFF'
            const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' })

            // Create download link
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `leads_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)

            toast.success(`${leadsToExport.length} leads exportados com sucesso!`)
        } catch (error) {
            console.error('Export error:', error)
            toast.error('Erro ao exportar leads')
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={isExporting || leads.length === 0}
            className="h-9 gap-2"
        >
            {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
                <Download className="h-4 w-4" />
            )}
            Exportar CSV
            {selectedIds?.length ? ` (${selectedIds.length})` : ''}
        </Button>
    )
}

// Escape CSV field to handle commas, quotes, and newlines
function escapeCSV(field: string): string {
    if (!field) return ''
    // If field contains semicolon, quote, or newline, wrap in quotes and escape internal quotes
    if (field.includes(';') || field.includes('"') || field.includes('\n')) {
        return `"${field.replace(/"/g, '""')}"`
    }
    return field
}
