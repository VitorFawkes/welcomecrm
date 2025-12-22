import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/Button'
import UserSelector from '../card/UserSelector'
import { AlertTriangle } from 'lucide-react'

interface StageChangeModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: (newOwnerId: string) => void
    currentOwnerId: string | null
    sdrName?: string
    targetStageName: string
}

export default function StageChangeModal({
    isOpen,
    onClose,
    onConfirm,
    currentOwnerId,
    sdrName,
    targetStageName
}: StageChangeModalProps) {
    const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(currentOwnerId)

    useEffect(() => {
        setSelectedOwnerId(currentOwnerId)
    }, [currentOwnerId, isOpen])

    const handleConfirm = () => {
        if (selectedOwnerId) {
            onConfirm(selectedOwnerId)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        Mudança de Responsável Necessária
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        O lead está saindo da fase de SDR para a etapa <strong>{targetStageName}</strong>.
                        É necessário definir um novo <strong>Dono do Negócio</strong>.
                    </p>

                    <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
                        <span className="font-semibold">Nota:</span> O SDR responsável permanecerá como <strong>{sdrName || 'Atual'}</strong>.
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Novo Dono do Negócio</label>
                        <UserSelector
                            currentUserId={selectedOwnerId}
                            onSelect={setSelectedOwnerId}
                        />
                        <p className="text-xs text-gray-500">
                            Se desejar manter o dono atual, apenas confirme abaixo.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedOwnerId}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        {selectedOwnerId === currentOwnerId ? 'Manter Dono e Mover' : 'Confirmar e Mover'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
