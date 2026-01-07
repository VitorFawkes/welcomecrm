import { useState } from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { usePeopleIntelligence, type Person } from '../hooks/usePeopleIntelligence'
import PeopleGrid from '../components/people/PeopleGrid'
import { PeopleFilterDrawer } from '../components/people/PeopleFilterDrawer'
import { PeopleActiveFilters } from '../components/people/PeopleActiveFilters'
import PersonDetailDrawer from '../components/people/PersonDetailDrawer'
import PeopleStatsBar from '../components/people/PeopleStatsBar'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '../components/ui/drawer'
import ContactForm from '../components/card/ContactForm'

export default function People() {
    const {
        people,
        loading,
        // totalCount,
        // page,
        // setPage,
        filters,
        setFilters,
        sort,
        setSort,
        summaryStats,
        refresh
    } = usePeopleIntelligence()

    const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false)
    const [isNewPersonDrawerOpen, setIsNewPersonDrawerOpen] = useState(false)
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)

    const handleCreateSuccess = () => {
        setIsNewPersonDrawerOpen(false)
        refresh()
    }

    return (
        <ErrorBoundary>
            <div className="flex h-full flex-col relative overflow-hidden bg-gray-50/50">
                {/* Header Section */}
                <div className="flex-shrink-0 pt-6 pb-4 px-8 bg-white/50 backdrop-blur-sm border-b border-gray-200/50 z-10">
                    <header className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Pessoas</h1>
                            <p className="mt-1 text-sm text-gray-500">Gerencie seus contatos e visualize inteligência de dados.</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                onClick={() => setIsNewPersonDrawerOpen(true)}
                                className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Nova Pessoa
                            </Button>
                        </div>
                    </header>

                    {/* Stats Bar */}
                    <div className="mb-6">
                        <PeopleStatsBar
                            totalPeople={summaryStats.totalPeople}
                            totalSpend={summaryStats.totalSpend}
                            totalTrips={summaryStats.totalTrips}
                            totalLeaders={summaryStats.totalLeaders}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome, email ou CPF..."
                                className="w-full pl-10 h-10 rounded-lg border-slate-200 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 bg-white shadow-sm outline-none transition-all"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            />
                        </div>

                        {/* Active Filters */}
                        <div className="flex-1 px-4 min-w-0">
                            <PeopleActiveFilters filters={filters} setFilters={setFilters} />
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
                    <PeopleGrid
                        people={people}
                        loading={loading}
                        sort={sort}
                        setSort={setSort}
                        onPersonClick={setSelectedPerson}
                    />
                </div>

                {/* Drawers */}
                <PeopleFilterDrawer
                    isOpen={isFilterDrawerOpen}
                    onClose={() => setIsFilterDrawerOpen(false)}
                    filters={filters}
                    setFilters={setFilters}
                />

                <PersonDetailDrawer
                    person={selectedPerson}
                    onClose={() => setSelectedPerson(null)}
                />

                <Drawer open={isNewPersonDrawerOpen} onOpenChange={setIsNewPersonDrawerOpen}>
                    <DrawerContent className="max-w-2xl">
                        <DrawerHeader className="border-b border-gray-100 pb-4">
                            <DrawerTitle className="text-2xl font-bold text-gray-900">
                                Nova Pessoa
                            </DrawerTitle>
                        </DrawerHeader>
                        <div className="p-6">
                            <ContactForm
                                onSave={handleCreateSuccess}
                                onCancel={() => setIsNewPersonDrawerOpen(false)}
                            />
                        </div>
                    </DrawerContent>
                </Drawer>
            </div>
        </ErrorBoundary>
    )
}
