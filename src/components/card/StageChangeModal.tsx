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
    requiredRole?: string
}

export default function StageChangeModal({
    isOpen,
    onClose,
    onConfirm,
    currentOwnerId,
    sdrName,
    targetStageName,
    requiredRole
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

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'vendas': return 'Planner / Vendedor'
            case 'concierge': return 'Concierge'
            case 'sdr': return 'SDR'
            default: return 'Responsável'
        }
    }

    const roleLabel = getRoleLabel(requiredRole)

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                        Definição de Responsável
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <p className="text-sm text-gray-600">
                        O card está entrando na etapa <strong>{targetStageName}</strong>.
                        {requiredRole ? (
                            <> Esta etapa exige um perfil de <strong>{roleLabel}</strong>.</>
                        ) : (
                            <> Verifique o responsável pelo card.</>
                        )}
                    </p>

                    {sdrName && (
                        <div className="bg-blue-50 p-3 rounded-md border border-blue-100 text-sm text-blue-800">
                            <span className="font-semibold">Nota:</span> O SDR original ({sdrName}) permanecerá vinculado.
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Selecionar {roleLabel}</label>
                        <UserSelector
                            currentUserId={selectedOwnerId}
                            onSelect={setSelectedOwnerId}
                        />
                        <p className="text-xs text-gray-500">
                            Se o responsável atual já for adequado, apenas confirme.
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
