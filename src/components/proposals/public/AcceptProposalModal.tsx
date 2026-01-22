/**
 * AcceptProposalModal - Modal for accepting proposal
 * 
 * Flow:
 * 1. Show summary of selections
 * 2. Confirm total price
 * 3. Submit acceptance
 * 4. Show success state
 */

import { useState } from 'react'
import { Check, X, Loader2, CheckCircle2, PartyPopper } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Selection {
    selected: boolean
    optionId?: string
    quantity?: number
}

interface AcceptProposalModalProps {
    isOpen: boolean
    onClose: () => void
    proposalId: string
    versionId: string
    total: number
    currency: string
    selections: Record<string, Selection>
    onSuccess?: () => void
}

type Step = 'confirm' | 'loading' | 'success'

export function AcceptProposalModal({
    isOpen,
    onClose,
    proposalId,
    versionId,
    total,
    currency,
    selections,
    onSuccess,
}: AcceptProposalModalProps) {
    const [step, setStep] = useState<Step>('confirm')
    const [error, setError] = useState<string | null>(null)

    const formatPrice = (value: number) =>
        new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency,
        }).format(value)

    const handleAccept = async () => {
        setStep('loading')
        setError(null)

        try {
            // 1. Save client selections (using existing table schema)
            const selectedItems = Object.entries(selections)
                .filter(([_, sel]) => sel.selected)
                .map(([itemId, sel]) => ({
                    proposal_id: proposalId,
                    item_id: itemId,
                    selected: true,
                    option_id: sel.optionId || null,
                    selection_metadata: {
                        quantity: sel.quantity || 1,
                        version_id: versionId,
                    },
                    selected_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }))

            // Insert client selections
            const { error: insertError } = await supabase
                .from('proposal_client_selections')
                .upsert(selectedItems, {
                    onConflict: 'proposal_id,item_id',
                    ignoreDuplicates: false
                })

            if (insertError) throw insertError

            // 2. Update proposal status to 'accepted'
            const { error: updateError } = await supabase
                .from('proposals')
                .update({
                    status: 'accepted',
                    accepted_at: new Date().toISOString(),
                    accepted_total: total,
                })
                .eq('id', proposalId)

            if (updateError) throw updateError

            // 3. Log event
            await supabase.from('proposal_events').insert({
                proposal_id: proposalId,
                event_type: 'proposal_accepted',
                payload: {
                    total,
                    currency,
                    items_count: selectedItems.length,
                },
            })

            setStep('success')
            onSuccess?.()

        } catch (err) {
            console.error('Error accepting proposal:', err)
            setError('Ocorreu um erro ao aceitar a proposta. Tente novamente.')
            setStep('confirm')
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={step === 'confirm' ? onClose : undefined}
            />

            {/* Modal */}
            <div className={cn(
                "relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl",
                "shadow-xl overflow-hidden transition-all duration-300",
                "animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95"
            )}>
                {/* Close button (confirm step only) */}
                {step === 'confirm' && (
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                )}

                {/* Content */}
                <div className="p-6">
                    {step === 'confirm' && (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                    <Check className="h-8 w-8 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-2">
                                    Confirmar Proposta
                                </h2>
                                <p className="text-slate-600 text-sm">
                                    Ao aceitar, você confirma seu interesse nesta proposta
                                    e suas seleções serão enviadas para a consultora.
                                </p>
                            </div>

                            {/* Total */}
                            <div className="bg-slate-50 rounded-xl p-4 mb-6">
                                <div className="flex items-center justify-between">
                                    <span className="text-slate-600">Total selecionado</span>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {formatPrice(total)}
                                    </span>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={onClose}
                                >
                                    Voltar
                                </Button>
                                <Button
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    onClick={handleAccept}
                                >
                                    Aceitar Proposta
                                </Button>
                            </div>

                            <p className="text-center text-xs text-slate-400 mt-4">
                                Esta ação não gera cobranças. Sua consultora entrará em contato.
                            </p>
                        </>
                    )}

                    {step === 'loading' && (
                        <div className="text-center py-12">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                            <p className="text-slate-600">Processando sua aceitação...</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="relative mb-6">
                                <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                                </div>
                                <PartyPopper className="absolute top-0 right-1/4 h-6 w-6 text-amber-500 animate-bounce" />
                            </div>

                            <h2 className="text-xl font-bold text-slate-900 mb-2">
                                Proposta Aceita! 🎉
                            </h2>
                            <p className="text-slate-600 text-sm mb-6">
                                Sua consultora receberá sua confirmação e entrará em contato
                                em breve para os próximos passos.
                            </p>

                            <div className="bg-green-50 rounded-xl p-4 mb-6">
                                <p className="text-green-700 font-medium">
                                    Total confirmado: {formatPrice(total)}
                                </p>
                            </div>

                            <Button
                                className="w-full"
                                onClick={onClose}
                            >
                                Fechar
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
