import { useMemo } from 'react'
import { Button } from '@/components/ui/Button'
import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import {
    Save,
    Send,
    Plane,
    Building2,
    Ship,
    Car,
    Sparkles,
} from 'lucide-react'
import type { ProposalSectionWithItems } from '@/types/proposals'

/**
 * PricingSidebar - Right sidebar with pricing summary
 * 
 * Shows:
 * - Total price
 * - Breakdown by category (Voos, Hospedagem, Cruzeiro, Carro)
 * - Save and Send buttons
 */

interface PricingSidebarProps {
    sections: ProposalSectionWithItems[]
}

// Category icons
const CATEGORY_ICONS: Record<string, React.ElementType> = {
    flights: Plane,
    hotels: Building2,
    cruise: Ship,
    transfers: Car,
    experiences: Sparkles,
}

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
    flights: 'Voos',
    hotels: 'Hospedagem',
    cruise: 'Cruzeiro',
    transfers: 'Carro',
    experiences: 'Experiências',
}

export function PricingSidebar({ sections }: PricingSidebarProps) {
    const { save, publish, isDirty, isSaving } = useProposalBuilder()

    // Calculate totals by category
    const { categoryTotals, grandTotal } = useMemo(() => {
        const totals: Record<string, number> = {}
        let total = 0

        sections.forEach((section) => {
            const category = section.section_type === 'custom' ? 'other' : section.section_type
            section.items.forEach((item) => {
                const price = item.base_price || 0
                totals[category] = (totals[category] || 0) + price
                total += price
            })
        })

        return { categoryTotals: totals, grandTotal: total }
    }, [sections])

    // Format currency
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)
    }

    // Get active categories (those with values)
    const activeCategories = Object.entries(categoryTotals)
        .filter(([, value]) => value > 0)
        .sort((a, b) => b[1] - a[1])

    return (
        <div className="w-[250px] flex-shrink-0 bg-white border-l border-slate-200 flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <h2 className="text-sm font-semibold text-slate-900">
                    Resumo
                </h2>
            </div>

            {/* Total */}
            <div className="p-4 border-b border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Total</p>
                <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(grandTotal)}
                </p>
            </div>

            {/* Breakdown */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {activeCategories.length > 0 ? (
                    activeCategories.map(([category, value]) => {
                        const Icon = CATEGORY_ICONS[category] || Sparkles
                        const label = CATEGORY_LABELS[category] || 'Outros'

                        return (
                            <div
                                key={category}
                                className="flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center">
                                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                                    </div>
                                    <span className="text-sm text-slate-600">
                                        {label}
                                    </span>
                                </div>
                                <span className="text-sm font-medium text-slate-900">
                                    {formatCurrency(value)}
                                </span>
                            </div>
                        )
                    })
                ) : (
                    <p className="text-sm text-slate-400 text-center py-4">
                        Adicione itens para ver o resumo
                    </p>
                )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-slate-200 space-y-2">
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => save()}
                    disabled={!isDirty || isSaving}
                >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button
                    className="w-full"
                    onClick={() => publish()}
                    disabled={isSaving}
                >
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                </Button>
            </div>
        </div>
    )
}

export default PricingSidebar
