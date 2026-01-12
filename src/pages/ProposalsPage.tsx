import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { useProposals, useProposalStats, type ProposalFilters } from '@/hooks/useProposals'
import { ProposalStatsBar } from '@/components/proposals/ProposalStatsBar'
import { ProposalGrid } from '@/components/proposals/ProposalGrid'
import { ProposalFilterDrawer } from '@/components/proposals/ProposalFilterDrawer'
import { ProposalActiveFilters } from '@/components/proposals/ProposalActiveFilters'
import type { ProposalStatus } from '@/types/proposals'

export default function ProposalsPage() {
    const navigate = useNavigate()
    const [filters, setFilters] = useState<ProposalFilters>({})
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)

    const { data: proposals, isLoading } = useProposals(filters)
    const { data: stats } = useProposalStats()

    const handleStatusFilter = (status: ProposalStatus | null) => {
        setFilters(prev => ({ ...prev, status }))
    }

    return (
        <ErrorBoundary>
            <div className="flex h-full flex-col relative overflow-hidden bg-gray-50/50">
                {/* Header Section */}
                <div className="flex-shrink-0 pt-6 pb-4 px-8 bg-white/50 backdrop-blur-sm border-b border-gray-200/50 z-10">
                    <header className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Propostas</h1>
                            <p className="mt-1 text-sm text-gray-500">Gerencie e acompanhe todas as suas propostas comerciais.</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                onClick={() => navigate('/pipeline')}
                                className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Nova Proposta
                            </Button>
                        </div>
                    </header>

                    {/* Stats Bar */}
                    <div className="mb-6">
                        <ProposalStatsBar
                            total={stats?.total || 0}
                            sent={stats?.sent || 0}
                            accepted={stats?.accepted || 0}
                            conversionRate={stats?.conversionRate || 0}
                            onStatusClick={handleStatusFilter}
                            activeStatus={filters.status || null}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por título ou card..."
                                className="w-full pl-10 h-10 rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white shadow-sm outline-none transition-all"
                                value={filters.search || ''}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>

                        {/* Active Filters */}
                        <div className="flex-1 px-4 min-w-0">
                            <ProposalActiveFilters filters={filters} setFilters={setFilters} />
                        </div>

                        {/* Filter Button */}
                        <button
                            onClick={() => setIsFilterDrawerOpen(true)}
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-all"
                        >
                            <Filter className="h-4 w-4 mr-2 text-gray-500" />
                            Filtros
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-h-0 relative px-8 pb-4 overflow-y-auto">
                    <ProposalGrid
                        proposals={proposals || []}
                        loading={isLoading}
                    />
                </div>

                {/* Filter Drawer */}
                <ProposalFilterDrawer
                    isOpen={isFilterDrawerOpen}
                    onClose={() => setIsFilterDrawerOpen(false)}
                    filters={filters}
                    setFilters={setFilters}
                />
            </div>
        </ErrorBoundary>
    )
}
