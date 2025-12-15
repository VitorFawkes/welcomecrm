import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface QualityGateModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    cardId: string
    targetStageName: string
    missingFields: { key: string, label: string }[]
}

export default function QualityGateModal({
    isOpen,
    onClose,
    onConfirm,
    cardId,
    targetStageName,
    missingFields
}: QualityGateModalProps) {
    const [values, setValues] = useState<Record<string, any>>({})
    const [isSaving, setIsSaving] = useState(false)
    const queryClient = useQueryClient()

    const handleChange = (key: string, value: any) => {
        setValues(prev => ({ ...prev, [key]: value }))
    }

    const updateCardMutation = useMutation({
        mutationFn: async (updates: any) => {
            // We need to handle where to save each field.
            // Some are top level, some are in produto_data.
            // This logic needs to be robust.

            const topLevelFields = ['valor_estimado', 'data_viagem_inicio', 'prioridade', 'origem', 'external_id', 'campaign_id']
            const produtoDataFields = ['destinos', 'orcamento', 'motivo', 'taxa_planejamento', 'epoca_viagem', 'pessoas']

            const topLevelUpdates: any = {}
            const produtoDataUpdates: any = {}

            Object.entries(updates).forEach(([key, value]) => {
                if (topLevelFields.includes(key)) {
                    topLevelUpdates[key] = value
                } else if (produtoDataFields.includes(key)) {
                    produtoDataUpdates[key] = value
                }
            })

            // If we have produto_data updates, we need to fetch current first to merge?
            // Or we can use jsonb_set in SQL, but supabase js client does simple updates.
            // Let's fetch current card first.

            let finalUpdates = { ...topLevelUpdates }

            if (Object.keys(produtoDataUpdates).length > 0) {
                const { data: card } = await supabase.from('cards').select('produto_data').eq('id', cardId).single()
                const currentData = card?.produto_data as any || {}

                // Merge
                // Note: This is a shallow merge for produto_data keys.
                // If 'orcamento' is an object, we are replacing it with whatever the input gives.
                // For this MVP, we assume simple inputs.

                finalUpdates.produto_data = {
                    ...currentData,
                    ...produtoDataUpdates
                }
            }

            const { error } = await supabase
                .from('cards')
                .update(finalUpdates)
                .eq('id', cardId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            onConfirm()
        }
    })

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateCardMutation.mutateAsync(values)
        } catch (error) {
            console.error(error)
            alert('Erro ao salvar dados.')
        } finally {
            setIsSaving(false)
        }
    }

    const renderInput = (field: { key: string, label: string }) => {
        switch (field.key) {
            case 'data_viagem_inicio':
                return (
                    <Input
                        type="date"
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        value={values[field.key] || ''}
                    />
                )
            case 'valor_estimado':
                return (
                    <Input
                        type="number"
                        placeholder="0.00"
                        onChange={(e) => handleChange(field.key, parseFloat(e.target.value))}
                        value={values[field.key] || ''}
                    />
                )
            case 'origem':
                return (
                    <Select
                        options={[
                            { value: 'site', label: 'Site' },
                            { value: 'indicacao', label: 'Indicação' },
                            { value: 'sdr', label: 'SDR' },
                            { value: 'recorrencia', label: 'Recorrência' },
                            { value: 'manual', label: 'Manual' },
                            { value: 'outro', label: 'Outro' }
                        ]}
                        onChange={(val) => handleChange(field.key, val)}
                        value={values[field.key] || ''}
                    />
                )
            case 'prioridade':
                return (
                    <Select
                        options={[
                            { value: 'alta', label: 'Alta' },
                            { value: 'media', label: 'Média' },
                            { value: 'baixa', label: 'Baixa' }
                        ]}
                        onChange={(val) => handleChange(field.key, val)}
                        value={values[field.key] || ''}
                    />
                )
            default:
                return (
                    <Input
                        type="text"
                        placeholder={`Digite ${field.label}`}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        value={values[field.key] || ''}
                    />
                )
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Campos Obrigatórios</DialogTitle>
                    <p className="text-sm text-gray-500">
                        Para mover para <strong>{targetStageName}</strong>, você precisa preencher os seguintes campos:
                    </p>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {missingFields.map(field => (
                        <div key={field.key} className="grid gap-2">
                            <label className="text-sm font-medium text-gray-700">
                                {field.label}
                            </label>
                            {renderInput(field)}
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Salvando...' : 'Salvar e Mover'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
