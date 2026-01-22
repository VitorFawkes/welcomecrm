'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/Button'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface QualityGateModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void // Keep for API compatibility but not used in new flow
    cardId: string
    targetStageName: string
    missingFields: { key: string, label: string }[]
    initialData?: Record<string, any>  // Keep for API compatibility
}

export default function QualityGateModal({
    isOpen,
    onClose,
    cardId,
    targetStageName,
    missingFields,
}: QualityGateModalProps) {
    const router = useRouter()

    const handleOpenCard = () => {
        onClose()
        router.push(`/viagens/${cardId}`)
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        Campos Obrigatórios
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        Para mover para a etapa <strong className="text-gray-900">{targetStageName}</strong>,
                        é necessário preencher os seguintes campos:
                    </p>

                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                        <ul className="space-y-2">
                            {missingFields.map(field => (
                                <li
                                    key={field.key}
                                    className="flex items-center gap-2 text-sm text-amber-800"
                                >
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full flex-shrink-0" />
                                    {field.label}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-xs text-gray-500">
                        Acesse a página do card para preencher os campos necessários.
                    </p>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleOpenCard}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Abrir Card
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
