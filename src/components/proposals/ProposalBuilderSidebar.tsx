import { useState } from 'react'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { LibrarySearch } from '@/components/proposals/LibrarySearch'
import { VersionHistory } from '@/components/proposals/VersionHistory'
import { AIImageExtractor } from '@/components/proposals/AIImageExtractor'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import {
    Calendar,
    Users,
    Calculator,
    Settings,
    Library,
    History,
    Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Proposal } from '@/types/proposals'
import type { LibrarySearchResult } from '@/hooks/useLibrary'
import type { ExtractedItem } from '@/hooks/useAIExtract'
import { toast } from 'sonner'

interface ProposalBuilderSidebarProps {
    proposal: Proposal
}

type SidebarTab = 'config' | 'library' | 'history' | 'ai'

export function ProposalBuilderSidebar({ proposal }: ProposalBuilderSidebarProps) {
    const [activeTab, setActiveTab] = useState<SidebarTab>('config')
    const { version, sections, addItemFromLibrary, selectedSectionId, welcomeMessage, updateWelcomeMessage } = useProposalBuilder()

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
        let targetSectionId = selectedSectionId

        // Auto-select: use selected section, or last section, or create "Outros"
        if (!targetSectionId) {
            if (sections.length > 0) {
                // Use the last section automatically
                targetSectionId = sections[sections.length - 1].id
                toast.info('Item adicionado à última seção', {
                    description: 'Selecione uma seção para escolher onde adicionar.'
                })
            } else {
                toast.warning('Crie uma seção primeiro', {
                    description: 'Use os templates de início rápido ou adicione uma seção manualmente.'
                })
                return
            }
        }

        addItemFromLibrary(targetSectionId, item)
        toast.success('Item adicionado!', {
            description: `"${item.name}" foi adicionado à seção.`
        })
    }

    const handleAIExtract = (items: ExtractedItem[]) => {
        if (!selectedSectionId) {
            toast.warning('Selecione uma seção primeiro', {
                description: 'Clique em uma seção para adicionar os itens extraídos.'
            })
            return
        }

        items.forEach(item => {
            // Map segments from AI extraction for flights
            const details = item.details || {}
            const segments = details.segments as Array<Record<string, unknown>> || []

            // Build rich_content with segments for flights
            const richContent: Record<string, unknown> = {
                description: item.description || '',
                location: item.location,
                dates: item.dates,
            }

            // If this is a flight with segments, add them to rich_content
            if (item.category === 'flight' && segments.length > 0) {
                richContent.segments = segments.map((seg, idx) => ({
                    id: `seg-${Date.now()}-${idx}`,
                    segment_order: seg.segment_order || idx + 1,
                    airline_code: seg.airline_code || '',
                    airline_name: seg.airline_name || '',
                    flight_number: seg.flight_number || '',
                    departure_date: seg.departure_date || '',
                    departure_time: seg.departure_time || '',
                    departure_airport: seg.departure_airport || '',
                    departure_city: seg.departure_city || '',
                    arrival_date: seg.arrival_date || '',
                    arrival_time: seg.arrival_time || '',
                    arrival_airport: seg.arrival_airport || '',
                    arrival_city: seg.arrival_city || '',
                    cabin_class: seg.cabin_class || 'Economy',
                    baggage_included: seg.baggage_included || '',
                }))
            }

            // Add company_name if present
            if ((item as unknown as Record<string, unknown>).company_name) {
                richContent.company_name = (item as unknown as Record<string, unknown>).company_name
            }

            const libraryFormat = {
                id: crypto.randomUUID(),
                name: item.title,
                category: item.category || 'custom',
                base_price: item.price || 0,
                currency: item.currency || 'BRL',
                content: richContent,
            } as unknown as LibrarySearchResult
            addItemFromLibrary(selectedSectionId, libraryFormat)
        })

        toast.success(`${items.length} item(s) adicionado(s)!`)
        setActiveTab('config')
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
                <button
                    onClick={() => setActiveTab('history')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                        activeTab === 'history'
                            ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                >
                    <History className="h-4 w-4" />
                    Versões
                </button>
                <button
                    onClick={() => setActiveTab('ai')}
                    className={cn(
                        'flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors',
                        activeTab === 'ai'
                            ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    )}
                >
                    <Sparkles className="h-4 w-4" />
                    IA
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
                        welcomeMessage={welcomeMessage}
                        onUpdateWelcomeMessage={updateWelcomeMessage}
                    />
                ) : activeTab === 'library' ? (
                    <LibraryTab
                        onSelectItem={handleSelectLibraryItem}
                        hasSelectedSection={!!selectedSectionId}
                    />
                ) : activeTab === 'history' ? (
                    <VersionHistory
                        proposalId={proposal.id}
                        currentVersionId={proposal.active_version_id}
                    />
                ) : (
                    <div className="p-4">
                        <AIImageExtractor
                            onExtractComplete={handleAIExtract}
                            onCancel={() => setActiveTab('config')}
                        />
                    </div>
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
    welcomeMessage: string
    onUpdateWelcomeMessage: (message: string) => void
}

function ConfigTab({
    proposal,
    version,
    sections,
    baseTotal,
    optionalTotal,
    grandTotal,
    formatCurrency,
    welcomeMessage,
    onUpdateWelcomeMessage,
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

            {/* Welcome Message */}
            <section>
                <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
                    Mensagem de Boas-vindas
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                    Mensagem personalizada que o cliente verá antes da proposta
                </p>
                <Textarea
                    value={welcomeMessage}
                    onChange={(e) => onUpdateWelcomeMessage(e.target.value)}
                    placeholder="Olá! Preparei esta proposta especialmente para você..."
                    className="text-sm min-h-[80px] resize-none"
                    rows={3}
                />
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
