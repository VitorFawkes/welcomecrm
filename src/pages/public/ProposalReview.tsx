import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { usePublicProposal } from '@/hooks/useProposal'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import {
    Loader2,
    AlertCircle,
    Check,
    ArrowLeft,
    ChevronDown,
    ChevronUp,
    FileCheck
} from 'lucide-react'

export default function ProposalReview() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const { data: proposal, isLoading, error } = usePublicProposal(token!)

    const [termsAccepted, setTermsAccepted] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showTerms, setShowTerms] = useState(false)

    const version = proposal?.active_version
    const sections = version?.sections || []

    // Calculate totals (simplified - in real app would use selections from state)
    const calculateTotal = () => {
        let total = 0
        sections.forEach(section => {
            section.items.forEach(item => {
                if (!item.is_optional || item.is_default_selected) {
                    total += Number(item.base_price) || 0
                }
            })
        })
        return total
    }

    const formatPrice = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        }).format(value)

    const handleAccept = async () => {
        if (!proposal || !termsAccepted) return

        setIsSubmitting(true)
        try {
            // Update proposal status
            const { error: updateError } = await supabase
                .from('proposals')
                .update({ status: 'accepted' })
                .eq('id', proposal.id)

            if (updateError) throw updateError

            // Log event
            await supabase.from('proposal_events').insert({
                proposal_id: proposal.id,
                event_type: 'proposal_accepted',
                payload: {
                    token,
                    accepted_at: new Date().toISOString(),
                },
                user_agent: navigator.userAgent,
            })

            // Navigate to confirmation
            navigate(`/p/${token}/confirmed`)
        } catch (err) {
            console.error('Error accepting proposal:', err)
            alert('Erro ao aceitar proposta. Tente novamente.')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            </div>
        )
    }

    if (error || !proposal) {
        return (
            <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
                <div className="text-center max-w-sm">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h1 className="text-xl font-semibold text-slate-900 mb-2">Proposta não encontrada</h1>
                    <p className="text-slate-600 text-sm">Este link pode ter expirado.</p>
                </div>
            </div>
        )
    }

    const total = calculateTotal()

    return (
        <div className="min-h-dvh bg-gradient-to-br from-slate-50 to-green-50">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="px-4 py-3 flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/p/${token}`)}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-slate-600" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-slate-900">Revisar Proposta</h1>
                        <p className="text-xs text-slate-500">{version?.title}</p>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="p-4 space-y-4 pb-32">
                {/* Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-blue-600" />
                            Resumo da Proposta
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {sections.map(section => (
                            <div key={section.id} className="p-4">
                                <h3 className="font-medium text-sm text-slate-700 mb-2">{section.title}</h3>
                                <div className="space-y-2">
                                    {section.items.map(item => {
                                        const isIncluded = !item.is_optional || item.is_default_selected
                                        return (
                                            <div
                                                key={item.id}
                                                className={`flex items-center justify-between text-sm ${isIncluded ? 'text-slate-900' : 'text-slate-400 line-through'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {isIncluded ? (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    ) : (
                                                        <span className="w-4 h-4" />
                                                    )}
                                                    <span>{item.title}</span>
                                                </div>
                                                <span className="font-medium">
                                                    {formatPrice(Number(item.base_price))}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="p-4 bg-green-50 border-t border-green-100">
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-green-900">Total</span>
                            <span className="text-2xl font-bold text-green-600">{formatPrice(total)}</span>
                        </div>
                    </div>
                </div>

                {/* Terms */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <button
                        onClick={() => setShowTerms(!showTerms)}
                        className="w-full p-4 flex items-center justify-between"
                    >
                        <span className="font-semibold text-slate-900">Termos e Condições</span>
                        {showTerms ? (
                            <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                            <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                    </button>

                    {showTerms && (
                        <div className="px-4 pb-4">
                            <div className="text-sm text-slate-600 space-y-2">
                                <p>Ao aceitar esta proposta, você concorda com os seguintes termos:</p>
                                <ul className="list-disc list-inside space-y-1 text-slate-500">
                                    <li>Os valores apresentados são válidos conforme a data de validade da proposta.</li>
                                    <li>Alterações podem incorrer em custos adicionais.</li>
                                    <li>A confirmação da reserva está sujeita à disponibilidade.</li>
                                    <li>Políticas de cancelamento serão enviadas após a confirmação.</li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Accept Checkbox */}
                    <div className="p-4 border-t border-slate-100">
                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-0.5 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-slate-700">
                                Li e aceito os termos e condições desta proposta.
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Sticky Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg safe-area-bottom">
                <div className="px-4 py-4">
                    <Button
                        size="lg"
                        onClick={handleAccept}
                        disabled={!termsAccepted || isSubmitting}
                        className="w-full h-14 text-base font-semibold"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <Check className="h-5 w-5 mr-2" />
                                Aceitar Proposta
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </div>
    )
}
