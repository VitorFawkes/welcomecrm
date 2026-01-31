import { useState } from 'react'
import { Database } from 'lucide-react'
import { useLeadsFilters } from '../hooks/useLeadsFilters'
import { useLeadsQuery } from '../hooks/useLeadsQuery'
import LeadsFilters from '../components/leads/LeadsFilters'
import LeadsTable from '../components/leads/LeadsTable'
import LeadsBulkActions from '../components/leads/LeadsBulkActions'
import LeadsExport from '../components/leads/LeadsExport'

export default function Leads() {
    const { filters } = useLeadsFilters()
    const { data: leads, isLoading } = useLeadsQuery({ filters })
    const [selectedIds, setSelectedIds] = useState<string[]>([])

    const handleSelectAll = (checked: boolean) => {
        if (checked && leads) {
            setSelectedIds(leads.map(l => l.id!))
        } else {
            setSelectedIds([])
        }
    }

    const handleSelectRow = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedIds(prev => [...prev, id])
        } else {
            setSelectedIds(prev => prev.filter(i => i !== id))
        }
    }

    const handleClearSelection = () => {
        setSelectedIds([])
    }

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Gestão de Leads</h1>
                        <p className="text-sm text-gray-500">
                            {isLoading ? 'Carregando...' : `${leads?.length || 0} leads encontrados`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <LeadsExport leads={leads || []} selectedIds={selectedIds.length > 0 ? selectedIds : undefined} />
                </div>
            </div>

            {/* Filters */}
            <LeadsFilters />

            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <LeadsBulkActions
                        selectedIds={selectedIds}
                        onClearSelection={handleClearSelection}
                    />
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto p-6">
                <LeadsTable
                    leads={leads || []}
                    selectedIds={selectedIds}
                    onSelectAll={handleSelectAll}
                    onSelectRow={handleSelectRow}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}
