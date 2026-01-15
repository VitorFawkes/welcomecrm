import { useState } from 'react'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { LibrarySearch } from '@/components/proposals/LibrarySearch'
import { Input } from '@/components/ui/Input'
import {
    Calendar,
    Users,
    Calculator,
    Settings,
    Library,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Proposal } from '@/types/proposals'
import type { LibrarySearchResult } from '@/hooks/useLibrary'
import { toast } from 'sonner'

interface ProposalBuilderSidebarProps {
    proposal: Proposal
}

type SidebarTab = 'config' | 'library'

export function ProposalBuilderSidebar({ proposal }: ProposalBuilderSidebarProps) {
    const [activeTab, setActiveTab] = useState<SidebarTab>('config')
    const { version, sections, addItemFromLibrary, selectedSectionId } = useProposalBuilder()

    // Calculate totals
    const calculateTotals = () => {
        let baseTotal = 0
        let optionalTotal = 0

        sections.forEach(section => {
            section.items.forEach(item => {
                const price = Number(item.base_price) || 0
                if (item.is_optional) {
                    if (item.is_default_selected) {
                        optionalTotal += price
                    }
                } else {
                    baseTotal += price
                }
            })
        })

        return { baseTotal, optionalTotal, grandTotal: baseTotal + optionalTotal }
    }

    const { baseTotal, optionalTotal, grandTotal } = calculateTotals()

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)

    const handleSelectLibraryItem = (item: LibrarySearchResult) => {
        if (!selectedSectionId) {
            toast.warning('Selecione uma seção primeiro', {
                description: 'Clique em uma seção para adicionar o item da biblioteca.'
            })
            return
        }

        addItemFromLibrary(selectedSectionId, item)
        toast.success('Item adicionado!', {
            description: `"${item.name}" foi adicionado à seção.`
        })
    }

    return (
        <div className="flex flex-col h-full">
            {/* Tab Buttons */}
            <div className="flex border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('config')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                        activeTab === 'config'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                >
                    <Settings className="h-4 w-4" />
                    Configurações
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                        activeTab === 'library'
                            ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                >
                    <Library className="h-4 w-4" />
                    Biblioteca
                </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'config' ? (
                    <ConfigTab
                        proposal={proposal}
                        version={version}
                        sections={sections}
                        baseTotal={baseTotal}
                        optionalTotal={optionalTotal}
                        grandTotal={grandTotal}
                        formatCurrency={formatCurrency}
                    />
                ) : (
                    <LibraryTab
                        onSelectItem={handleSelectLibraryItem}
                        hasSelectedSection={!!selectedSectionId}
                    />
                )}
            </div>
        </div>
    )
}

// ============================================
// Config Tab (original content)
// ============================================
interface ConfigTabProps {
    proposal: Proposal
    version: any
    sections: any[]
    baseTotal: number
    optionalTotal: number
    grandTotal: number
    formatCurrency: (value: number) => string
}

function ConfigTab({
    proposal,
    version,
    sections,
    baseTotal,
    optionalTotal,
    grandTotal,
    formatCurrency,
}: ConfigTabProps) {
    return (
        <div className="p-4 space-y-6">
            {/* General Config */}
            <section>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                    Configurações
                </h3>
                <div className="space-y-3">
                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block">
                            Título da Proposta
                        </label>
                        <Input
                            value={version?.title || ''}
                            placeholder="Ex: Viagem para Maldivas"
                            className="h-9 text-sm"
                            readOnly
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium text-slate-700 mb-1 block flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            Válida até
                        </label>
                        <Input
                            type="date"
                            value={proposal.expires_at ? new Date(proposal.expires_at).toISOString().split('T')[0] : ''}
                            className="h-9 text-sm"
                            readOnly
                        />
                    </div>
                </div>
            </section>

            {/* Travelers */}
            <section>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    Viajantes
                </h3>
                <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-500 text-center">
                        Viajantes serão carregados do Card
                    </p>
                </div>
            </section>

            {/* Financial Summary */}
            <section>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-1">
                    <Calculator className="h-3.5 w-3.5" />
                    Resumo Financeiro
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Itens Fixos</span>
                        <span className="font-medium text-slate-900">{formatCurrency(baseTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Opcionais (selecionados)</span>
                        <span className="font-medium text-slate-900">{formatCurrency(optionalTotal)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between text-base font-semibold">
                        <span className="text-slate-900">Total</span>
                        <span className="text-green-600">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>
            </section>

            {/* Section Count */}
            <section>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                    Estatísticas
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{sections.length}</p>
                        <p className="text-xs text-blue-600/70">Seções</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-600">
                            {sections.reduce((acc, s) => acc + s.items.length, 0)}
                        </p>
                        <p className="text-xs text-purple-600/70">Itens</p>
                    </div>
                </div>
            </section>
        </div>
    )
}

// ============================================
// Library Tab
// ============================================
interface LibraryTabProps {
    onSelectItem: (item: LibrarySearchResult) => void
    hasSelectedSection: boolean
}

function LibraryTab({ onSelectItem, hasSelectedSection }: LibraryTabProps) {
    return (
        <div className="p-4">
            {!hasSelectedSection && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                        <strong>Dica:</strong> Selecione uma seção no editor para adicionar itens da biblioteca.
                    </p>
                </div>
            )}
            <LibrarySearch
                onSelectItem={onSelectItem}
                className="h-full"
            />
        </div>
    )
}
