import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SortBy = 'created_at' | 'updated_at' | 'data_viagem_inicio' | 'titulo' | 'valor_estimado'
export type SortDirection = 'asc' | 'desc'

export interface LeadsFilterState {
    search?: string
    creationStartDate?: string
    creationEndDate?: string
    ownerIds?: string[]
    stageIds?: string[]
    statusComercial?: string[]
    prioridade?: string[]
    sortBy: SortBy
    sortDirection: SortDirection
}

interface LeadsFiltersStore {
    filters: LeadsFilterState
    setFilters: (filters: Partial<LeadsFilterState>) => void
    setSearch: (search: string) => void
    toggleOwner: (ownerId: string) => void
    toggleStage: (stageId: string) => void
    toggleStatus: (status: string) => void
    togglePrioridade: (prioridade: string) => void
    clearFilters: () => void
    reset: () => void
}

const initialFilters: LeadsFilterState = {
    sortBy: 'created_at',
    sortDirection: 'desc'
}

export const useLeadsFilters = create<LeadsFiltersStore>()(
    persist(
        (set) => ({
            filters: initialFilters,

            setFilters: (newFilters) => set((state) => ({
                filters: { ...state.filters, ...newFilters }
            })),

            setSearch: (search) => set((state) => ({
                filters: { ...state.filters, search }
            })),

            toggleOwner: (ownerId) => set((state) => {
                const current = state.filters.ownerIds || []
                const updated = current.includes(ownerId)
                    ? current.filter(id => id !== ownerId)
                    : [...current, ownerId]
                return { filters: { ...state.filters, ownerIds: updated } }
            }),

            toggleStage: (stageId) => set((state) => {
                const current = state.filters.stageIds || []
                const updated = current.includes(stageId)
                    ? current.filter(id => id !== stageId)
                    : [...current, stageId]
                return { filters: { ...state.filters, stageIds: updated } }
            }),

            toggleStatus: (status) => set((state) => {
                const current = state.filters.statusComercial || []
                const updated = current.includes(status)
                    ? current.filter(s => s !== status)
                    : [...current, status]
                return { filters: { ...state.filters, statusComercial: updated } }
            }),

            togglePrioridade: (prioridade) => set((state) => {
                const current = state.filters.prioridade || []
                const updated = current.includes(prioridade)
                    ? current.filter(p => p !== prioridade)
                    : [...current, prioridade]
                return { filters: { ...state.filters, prioridade: updated } }
            }),

            clearFilters: () => set({ filters: initialFilters }),

            reset: () => set({ filters: initialFilters })
        }),
        {
            name: 'leads-filters-storage',
            partialize: (state) => ({ filters: state.filters })
        }
    )
)
