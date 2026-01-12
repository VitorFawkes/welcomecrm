import { useProposalBuilder } from '@/hooks/useProposalBuilder'
import { Input } from '@/components/ui/Input'
import {
    Calendar,
    Users,
    Calculator,
} from 'lucide-react'
import type { Proposal } from '@/types/proposals'

interface ProposalBuilderSidebarProps {
    proposal: Proposal
}

export function ProposalBuilderSidebar({ proposal }: ProposalBuilderSidebarProps) {
    const { version, sections } = useProposalBuilder()

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
