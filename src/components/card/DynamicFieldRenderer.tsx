import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { getFieldRegistry } from '../../lib/fieldRegistry'
import type { Database } from '../../database.types'

type Card = Database['public']['Views']['view_cards_acoes']['Row']
type Fase = 'SDR' | 'Planner' | 'Pós-venda' | 'Outro'

interface DynamicFieldRendererProps {
    card: Card
}

interface FieldSettings {
    campos_visiveis: string[]
    ordem_campos: string[]
}

export default function DynamicFieldRenderer({ card }: DynamicFieldRendererProps) {
    const [editingField, setEditingField] = useState<string | null>(null)
    const [editedData, setEditedData] = useState(card.produto_data || {})
    const queryClient = useQueryClient()

    const fase = (card.fase || 'Outro') as Fase

    // Fetch field settings for this phase
    const { data: fieldSettings } = useQuery({
        queryKey: ['pipeline_card_settings', fase],
        queryFn: async () => {
            const { data, error } = await (supabase.from('pipeline_card_settings') as any)
                .select('campos_visiveis, ordem_campos')
                .eq('fase', fase)
                .is('usuario_id', null) // Get default settings
                .single()

            if (error) throw error
            return data as FieldSettings
        },
        enabled: fase !== 'Outro'
    })

    // Mutation to save updated produto_data
    const updateCardMutation = useMutation({
        mutationFn: async (newProdutoData: any) => {
            const { error } = await (supabase.from('cards') as any)
                .update({ produto_data: newProdutoData })
                .eq('id', card.id!)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id] })
            queryClient.invalidateQueries({ queryKey: ['cards'] })
        }
    })

    const handleFieldChange = (fieldName: string, value: any) => {
        setEditedData((prev: any) => ({
            ...prev,
            [fieldName]: value
        }))
    }

    const handleFieldSave = () => {
        // Save the current edited data
        updateCardMutation.mutate(editedData)
        setEditingField(null)
    }

    const handleFieldEdit = (fieldName: string) => {
        setEditingField(fieldName)
    }

    // If no field settings yet or fase is "Outro", show placeholder
    if (!fieldSettings || fase === 'Outro') {
        return (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h3 className="mb-4 text-lg font-medium text-gray-900">Dados do Produto ({card.produto})</h3>
                <p className="text-sm text-gray-500">
                    Configuração de campos não disponível para esta fase.
                </p>
            </div>
        )
    }

    const fieldRegistry = getFieldRegistry(card.produto as 'TRIPS' | 'WEDDING' | 'CORP')
    const visibleFields = fieldSettings.campos_visiveis || []
    const orderedFields = fieldSettings.ordem_campos || visibleFields

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900">Dados do Produto ({card.produto})</h3>
                <p className="text-xs text-gray-500 mt-1">Clique em um campo para editar</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orderedFields.map((fieldName) => {
                    // Only show if in visible fields
                    if (!visibleFields.includes(fieldName)) return null

                    const fieldConfig = fieldRegistry[fieldName]
                    if (!fieldConfig) return null

                    const FieldComponent = fieldConfig.component
                    const isCurrentlyEditing = editingField === fieldName
                    const currentValue = isCurrentlyEditing
                        ? (editedData as any)?.[fieldName]
                        : (card.produto_data as any)?.[fieldName]

                    return (
                        <div
                            key={fieldName}
                            className="col-span-1"
                            onClick={() => !isCurrentlyEditing && handleFieldEdit(fieldName)}
                        >
                            <FieldComponent
                                label={fieldConfig.label}
                                value={currentValue}
                                onChange={isCurrentlyEditing ? (val: any) => handleFieldChange(fieldName, val) : undefined}
                                onSave={() => handleFieldSave()}
                                readOnly={!isCurrentlyEditing}
                                cardId={card.id}
                            />
                        </div>
                    )
                })}
            </div>

            {orderedFields.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                    Nenhum campo configurado para esta fase.
                </p>
            )}
        </div>
    )
}
