import { useState } from 'react'
import KanbanBoard from '../components/pipeline/KanbanBoard'
import { cn } from '../lib/utils'
import CreateCardModal from '../components/pipeline/CreateCardModal'
import { usePipelineFilters } from '../hooks/usePipelineFilters'
import { useProductContext } from '../hooks/useProductContext'

import { FilterDrawer } from '../components/pipeline/FilterDrawer'
import { ActiveFilters } from '../components/pipeline/ActiveFilters'
import { Filter, Link, User } from 'lucide-react'

import { ErrorBoundary } from '../components/ui/ErrorBoundary'

export default function Pipeline() {
    const {
        viewMode, subView, groupFilters,
        setViewMode, setSubView, setGroupFilters
    } = usePipelineFilters()
    const { currentProduct } = useProductContext()
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)


    return (
        <ErrorBoundary>
            {/* Main Container: Uses h-full to fill the Layout shell */}
            <div className="flex h-full flex-col relative overflow-hidden bg-gray-50/50">

                {/* Header Section: Fixed height, shared padding with Board */}
                <div className="flex-shrink-0 pt-6 pb-4 px-8 bg-white/50 backdrop-blur-sm border-b border-gray-200/50 z-10">
                    <header className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Pipeline</h1>
                            <p className="mt-1 text-sm text-gray-500">Gerencie suas oportunidades e acompanhe o progresso.</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">Vitor Gambetti</p>
                                <p className="text-xs text-gray-500">Admin</p>
                            </div>
                        </div>
                    </header>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-wrap">
                                {/* View Switcher (Persona Based) */}
                                <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                                    <button
                                        onClick={() => { setViewMode('AGENT'); setSubView('MY_QUEUE'); }}
                                        className={cn(
                                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                            viewMode === 'AGENT' && subView === 'MY_QUEUE'
                                                ? "bg-primary text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                        )}
                                    >
                                        Minha Fila
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('MANAGER'); setSubView('TEAM_VIEW'); }}
                                        className={cn(
                                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                            viewMode === 'MANAGER' && subView === 'TEAM_VIEW'
                                                ? "bg-primary text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                        )}
                                    >
                                        Visão de Time
                                    </button>
                                    <button
                                        onClick={() => { setViewMode('MANAGER'); setSubView('ALL'); }}
                                        className={cn(
                                            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                                            subView === 'ALL'
                                                ? "bg-primary text-white shadow-sm"
                                                : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                        )}
                                    >
                                        Todos
                                    </button>
                                </div>

                                {/* Group Filters (2 Chips - Linked/Solo) */}
                                <div className="flex items-center space-x-2 border-l border-gray-200 pl-4">
                                    <button
                                        onClick={() => setGroupFilters({ ...groupFilters, showLinked: !groupFilters.showLinked })}
                                        className={cn(
                                            "flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200",
                                            groupFilters.showLinked
                                                ? "bg-blue-100 text-blue-700 border-blue-300 shadow-sm"
                                                : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        <Link className="h-3 w-3 mr-1.5" />
                                        Em Grupo
                                    </button>
                                    <button
                                        onClick={() => setGroupFilters({ ...groupFilters, showSolo: !groupFilters.showSolo })}
                                        className={cn(
                                            "flex items-center px-3 py-1.5 text-xs font-semibold rounded-full border transition-all duration-200",
                                            groupFilters.showSolo
                                                ? "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-sm"
                                                : "bg-white text-gray-400 border-gray-200 hover:bg-gray-50"
                                        )}
                                    >
                                        <User className="h-3 w-3 mr-1.5" />
                                        Avulsas
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center space-x-3">
                                {/* Smart Filter Button */}
                                <button
                                    onClick={() => setIsFilterDrawerOpen(true)}
                                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-sm transition-all"
                                >
                                    <Filter className="h-4 w-4 mr-2 text-gray-500" />
                                    Filtros
                                </button>

                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark border border-transparent rounded-lg shadow-sm transition-all"
                                >
                                    <span className="mr-1.5 text-lg leading-none">+</span>
                                    Novo Card
                                </button>
                            </div>
                        </div>

                        {/* Active Filters - Full Width Row */}
                        <div className="w-full">
                            <ActiveFilters />
                        </div>
                    </div>
                </div>


                {/* Board Container: Fills remaining space, passes padding prop for alignment */}
                <div className="flex-1 min-h-0 relative">
                    <KanbanBoard
                        productFilter={currentProduct}
                        viewMode={viewMode}
                        subView={subView}
                        filters={usePipelineFilters().filters}
                        className="h-full px-8 pb-4" // Shared horizontal padding
                    />
                </div>

                <CreateCardModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                />

                <FilterDrawer
                    isOpen={isFilterDrawerOpen}
                    onClose={() => setIsFilterDrawerOpen(false)}
                />
            </div>
        </ErrorBoundary >
    )
}
