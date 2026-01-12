import { create } from 'zustand'

export type ViewMode = 'AGENT' | 'MANAGER'
export type SubView = 'MY_QUEUE' | 'ATTENTION' | 'TEAM_VIEW' | 'FORECAST' | 'ALL'

export type SortBy = 'created_at' | 'updated_at' | 'data_viagem_inicio' | 'data_proxima_tarefa'
export type SortDirection = 'asc' | 'desc'

export interface FilterState {
    search?: string
    startDate?: string
    endDate?: string
    creationStartDate?: string
    creationEndDate?: string
    ownerId?: string // Legacy single select
    ownerIds?: string[] // Multi-select
    sdrIds?: string[] // Multi-select
    teamIds?: string[]
    departmentIds?: string[]
    sortBy?: SortBy
    sortDirection?: SortDirection
}

export interface GroupFilters {
    showLinked: boolean
    showSolo: boolean
}

interface PipelineFiltersState {
    viewMode: ViewMode
    subView: SubView
    filters: FilterState
    groupFilters: GroupFilters
    collapsedPhases: string[]
    setViewMode: (mode: ViewMode) => void
    setSubView: (view: SubView) => void
    setFilters: (filters: FilterState) => void
    setGroupFilters: (filters: GroupFilters) => void
    setCollapsedPhases: (phases: string[]) => void
}

import { persist } from 'zustand/middleware'

export const usePipelineFilters = create<PipelineFiltersState>()(
    persist(
        (set) => ({
            viewMode: 'AGENT',
            subView: 'MY_QUEUE',
            filters: {
                sortBy: 'created_at',
                sortDirection: 'desc'
            },
            groupFilters: {
                showLinked: true,
                showSolo: true
            },
            collapsedPhases: [],
            setViewMode: (mode) => set({ viewMode: mode }),
            setSubView: (view) => set({ subView: view }),
            setFilters: (filters) => set({ filters }),
            setGroupFilters: (groupFilters) => set({ groupFilters }),
            setCollapsedPhases: (phases) => set({ collapsedPhases: phases }),
        }),
        {
            name: 'pipeline-filters', // unique name for localStorage key
        }
    )
)
