import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import {
    GitMerge,
    Plus,
    ArrowRight,
    RefreshCw,
    AlertTriangle,
    CheckCircle2
} from 'lucide-react'
import { useSubCards, type SubCard } from '@/hooks/useSubCards'
import { cn } from '@/lib/utils'

interface MergeSubCardModalProps {
    isOpen: boolean
    onClose: () => void
    subCard: SubCard
    parentValor?: number | null
}

export default function MergeSubCardModal({
    isOpen,
    onClose,
    subCard,
    parentValor
}: MergeSubCardModalProps) {
    const { mergeSubCard, isMerging } = useSubCards()
    const [confirmed, setConfirmed] = useState(false)

    const isIncremental = subCard.sub_card_mode === 'incremental'
    const subCardValue = subCard.valor_final ?? subCard.valor_estimado ?? 0
    const parentValue = parentValor ?? 0

    // Calculate new value based on mode
    const newValue = isIncremental
        ? parentValue + subCardValue
        : subCardValue

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    const handleMerge = () => {
        mergeSubCard(subCard.id, {
            onSuccess: () => {
                onClose()
            }
        })
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px] bg-white border-gray-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
                        <GitMerge className={cn(
                            'w-5 h-5',
                            isIncremental ? 'text-orange-500' : 'text-blue-500'
                        )} />
                        Concluir Alteração
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Sub-card info */}
                    <div className={cn(
                        'p-4 rounded-lg border-l-4',
                        isIncremental
                            ? 'bg-orange-50 border-orange-500'
                            : 'bg-blue-50 border-blue-500'
                    )}>
                        <div className="flex items-center gap-2 mb-2">
                            {isIncremental ? (
                                <Plus className="w-4 h-4 text-orange-600" />
                            ) : (
                                <RefreshCw className="w-4 h-4 text-blue-600" />
                            )}
                            <span className={cn(
                                'text-sm font-semibold',
                                isIncremental ? 'text-orange-700' : 'text-blue-700'
                            )}>
                                {subCard.titulo}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600">
                            Modo: {isIncremental ? 'Adicional (soma)' : 'Revisão (substitui)'}
                        </p>
                    </div>

                    {/* Value calculation */}
                    <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-700">
                            Cálculo do Valor
                        </h4>

                        {isIncremental ? (
                            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">Card Principal</p>
                                    <p className="text-lg font-semibold text-gray-700">
                                        {formatCurrency(parentValue)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100">
                                    <Plus className="w-4 h-4 text-orange-600" />
                                </div>

                                <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">Alteração</p>
                                    <p className="text-lg font-semibold text-orange-600">
                                        {formatCurrency(subCardValue)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-200">
                                    <ArrowRight className="w-4 h-4 text-gray-600" />
                                </div>

                                <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">Novo Total</p>
                                    <p className="text-xl font-bold text-green-600">
                                        {formatCurrency(newValue)}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
                                <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">Valor Atual</p>
                                    <p className="text-lg font-semibold text-gray-400 line-through">
                                        {formatCurrency(parentValue)}
                                    </p>
                                </div>

                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100">
                                    <ArrowRight className="w-4 h-4 text-blue-600" />
                                </div>

                                <div className="text-center">
                                    <p className="text-xs text-gray-500 mb-1">Novo Valor</p>
                                    <p className="text-xl font-bold text-blue-600">
                                        {formatCurrency(newValue)}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirmation */}
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-amber-800 font-medium">
                                Esta ação não pode ser desfeita
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                                O card de alteração será marcado como concluído e o valor
                                do card principal será atualizado.
                            </p>
                        </div>
                    </div>

                    {/* Confirmation checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                            className={cn(
                                'w-4 h-4 rounded border-gray-300',
                                isIncremental
                                    ? 'text-orange-600 focus:ring-orange-500'
                                    : 'text-blue-600 focus:ring-blue-500'
                            )}
                        />
                        <span className="text-sm text-gray-700">
                            Confirmo que desejo concluir esta alteração
                        </span>
                    </label>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isMerging}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleMerge}
                        disabled={!confirmed || isMerging}
                        className={cn(
                            'text-white',
                            isIncremental
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        )}
                    >
                        {isMerging ? (
                            <>
                                <span className="animate-spin mr-2">&#9696;</span>
                                Processando...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Concluir Alteração
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
