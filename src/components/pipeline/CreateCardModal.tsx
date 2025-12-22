import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Plus, User, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import ContactSelector from '../card/ContactSelector'
import type { Database } from '../../database.types'

type Product = Database['public']['Enums']['app_product']

interface CreateCardModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function CreateCardModal({ isOpen, onClose }: CreateCardModalProps) {
    const queryClient = useQueryClient()
    const [showContactSelector, setShowContactSelector] = useState(false)
    const [formData, setFormData] = useState({
        titulo: '',
        produto: 'TRIPS' as Product,
        valor_estimado: '',
        pessoa_principal_id: null as string | null,
        pessoa_principal_nome: null as string | null
    })

    const createCardMutation = useMutation({
        mutationFn: async () => {
            // Get the first stage for the selected product
            const { data: pipeline } = await (supabase.from('pipelines') as any)
                .select('id')
                .eq('produto', formData.produto)
                .single()

            if (!pipeline) throw new Error('Pipeline not found')

            const { data: firstStage } = await (supabase.from('pipeline_stages') as any)
                .select('id')
                .eq('pipeline_id', pipeline.id)
                .order('ordem')
                .limit(1)
                .single()

            if (!firstStage) throw new Error('No stages found')

            // Create the card
            const { data: card, error } = await (supabase.from('cards') as any)
                .insert({
                    titulo: formData.titulo,
                    produto: formData.produto,
                    valor_estimado: parseFloat(formData.valor_estimado) || 0,
                    pessoa_principal_id: formData.pessoa_principal_id,
                    pipeline_stage_id: firstStage.id,
                    status_comercial: 'em_andamento',
                    moeda: 'BRL'
                })
                .select()
                .single()

            if (error) throw error

            // If primary contact is set, also add to cards_contatos as titular?
            // The ContactSelector might have already added it if we used it in "add traveler" mode,
            // but here we are creating a NEW card, so the card ID didn't exist yet.
            // So ContactSelector couldn't have added it to cards_contatos.
            // Wait, ContactSelector requires cardId.
            // Ah! ContactSelector needs a cardId to add to cards_contatos.
            // But here we don't have a cardId yet.
            // So we can't use ContactSelector in its current form to "add to card".
            // We need ContactSelector to just RETURN the contact ID.
            // I need to modify ContactSelector to make cardId optional or handle "selection only" mode.

            return card
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            onClose()
            setFormData({
                titulo: '',
                produto: 'TRIPS',
                valor_estimado: '',
                pessoa_principal_id: null,
                pessoa_principal_nome: null
            })
        }
    })

    const handleSave = () => {
        if (!formData.titulo || !formData.pessoa_principal_id) return
        createCardMutation.mutate()
    }

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Novo Card</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Título <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.titulo}
                                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Ex: Viagem Europa 2024"
                                autoFocus
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Produto</label>
                                <select
                                    value={formData.produto}
                                    onChange={(e) => setFormData({ ...formData, produto: e.target.value as Product })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="TRIPS">Trips</option>
                                    <option value="WEDDING">Wedding</option>
                                    <option value="CORP">Corp</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Estimado</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                                    <input
                                        type="number"
                                        value={formData.valor_estimado}
                                        onChange={(e) => setFormData({ ...formData, valor_estimado: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Contato Principal <span className="text-red-500">*</span>
                            </label>

                            {formData.pessoa_principal_id ? (
                                <div className="flex items-center justify-between p-3 border rounded-md bg-gray-50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                                            <User className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{formData.pessoa_principal_nome}</p>
                                            <p className="text-xs text-gray-500">Selecionado</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setFormData({ ...formData, pessoa_principal_id: null, pessoa_principal_nome: null })}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowContactSelector(true)}
                                    className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                                >
                                    <Plus className="h-4 w-4" />
                                    Selecionar Contato
                                </button>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!formData.titulo || !formData.pessoa_principal_id || createCardMutation.isPending}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {createCardMutation.isPending ? 'Criando...' : 'Criar Card'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showContactSelector && (
                <ContactSelector
                    cardId="" // Empty string or null? Need to update ContactSelector to handle this
                    onClose={() => setShowContactSelector(false)}
                    onContactAdded={(contactId, contact) => {
                        if (contactId && contact) {
                            setFormData({
                                ...formData,
                                pessoa_principal_id: contactId,
                                pessoa_principal_nome: contact.nome
                            })
                            setShowContactSelector(false)
                        } else if (contactId) {
                            // Fallback if contact object is missing (shouldn't happen with updated ContactSelector)
                            supabase.from('contatos').select('nome').eq('id', contactId).single().then(({ data }) => {
                                if (data) {
                                    setFormData({
                                        ...formData,
                                        pessoa_principal_id: contactId,
                                        pessoa_principal_nome: data.nome
                                    })
                                    setShowContactSelector(false)
                                }
                            })
                        }
                    }}
                />
            )}
        </>
    )
}
