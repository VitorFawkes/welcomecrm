import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog'
import { Button } from '../ui/Button'
import { Plus, User, X, Loader2, MapPin } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'
import ContactSelector from '../card/ContactSelector'
import OwnerSelector from './OwnerSelector'
import { Input } from '../ui/Input'
import { useAuth } from '../../contexts/AuthContext'
import { useAllowedStages } from '../../hooks/useCardCreationRules'
import type { Database } from '../../database.types'

type Product = Database['public']['Enums']['app_product']

interface CreateCardModalProps {
    isOpen: boolean
    onClose: () => void
}

// RequiredFields interface removed - no fields are required for card creation

export default function CreateCardModal({ isOpen, onClose }: CreateCardModalProps) {
    const queryClient = useQueryClient()
    const contentRef = useRef<HTMLDivElement>(null)
    const [showContactSelector, setShowContactSelector] = useState(false)

    // Scroll to top when modal opens or when returning from ContactSelector
    useEffect(() => {
        if (isOpen && !showContactSelector && contentRef.current) {
            contentRef.current.scrollTop = 0
        }
    }, [isOpen, showContactSelector])

    // Core form data
    const [formData, setFormData] = useState({
        titulo: '',
        produto: 'TRIPS' as Product,
        pessoa_principal_id: null as string | null,
        pessoa_principal_nome: null as string | null,
        sdr_owner_id: null as string | null,
        sdr_owner_nome: null as string | null,
        selectedStageId: null as string | null
    })

    // Dynamic fields stored in briefing_inicial (for future use)
    const [dynamicFields] = useState<Record<string, any>>({})

    // Get allowed stages for user's team
    const { allowedStages, isLoading: loadingStages, isAdmin } = useAllowedStages(formData.produto)
    const { profile } = useAuth()

    // Auto-select first allowed stage when stages load
    useEffect(() => {
        if (allowedStages.length > 0 && !formData.selectedStageId) {
            setFormData(prev => ({ ...prev, selectedStageId: allowedStages[0].id }))
        }
    }, [allowedStages, formData.selectedStageId])

    // Get pipeline ID for the selected product
    const { data: pipeline } = useQuery({
        queryKey: ['pipeline-for-product', formData.produto],
        queryFn: async () => {
            const { data } = await supabase
                .from('pipelines')
                .select('id')
                .eq('produto', formData.produto)
                .eq('ativo', true)
                .single()
            return data
        }
    })

    // NOTE: No required fields are enforced at card creation time.
    // Governance rules (required fields per stage) apply only AFTER creation.


    // Title and stage are required for card creation
    const canSubmit = formData.titulo.trim().length > 0 && !!formData.selectedStageId && !!pipeline

    const createCardMutation = useMutation({
        mutationFn: async () => {
            if (!pipeline || !formData.selectedStageId) throw new Error('Pipeline or stage not selected')

            // Create the card with governance data in briefing_inicial
            const { data: card, error } = await supabase
                .from('cards')
                .insert({
                    titulo: formData.titulo,
                    produto: formData.produto,
                    pessoa_principal_id: formData.pessoa_principal_id,
                    pipeline_id: pipeline.id,
                    pipeline_stage_id: formData.selectedStageId,
                    sdr_owner_id: formData.sdr_owner_id, // Keep null if not selected - important for reporting
                    dono_atual_id: formData.sdr_owner_id ?? profile?.id, // Current owner can default to logged user
                    origem: 'manual',
                    status_comercial: 'em_andamento',
                    moeda: 'BRL',
                    briefing_inicial: dynamicFields
                } as any)
                .select()
                .single()

            if (error) throw error
            return card
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            queryClient.invalidateQueries({ queryKey: ['pipeline'] })
            onClose()
            // Reset form
            setFormData({
                titulo: '',
                produto: 'TRIPS',
                pessoa_principal_id: null,
                pessoa_principal_nome: null,
                sdr_owner_id: null,
                sdr_owner_nome: null,
                selectedStageId: null
            })
        }
    })

    const handleSave = () => {
        if (!canSubmit) return
        createCardMutation.mutate()
    }

    const handleClose = () => {
        if (createCardMutation.isPending) return
        onClose()
    }


    return (
        <>
            <Dialog open={isOpen} onOpenChange={handleClose}>
                <DialogContent ref={contentRef} className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold text-slate-900">
                            Novo Card
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Section: Basic Info */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                Informações Básicas
                            </h3>

                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Título <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    type="text"
                                    value={formData.titulo}
                                    onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                                    placeholder="Ex: Viagem Europa 2024"
                                    autoFocus
                                />
                            </div>

                            {/* Contact */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Contato Principal
                                </label>

                                {formData.pessoa_principal_id ? (
                                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                <User className="h-4 w-4 text-indigo-600" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">{formData.pessoa_principal_nome}</p>
                                                <p className="text-xs text-slate-500">Selecionado</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, pessoa_principal_id: null, pessoa_principal_nome: null })}
                                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => setShowContactSelector(true)}
                                        className="w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Selecionar Contato
                                    </button>
                                )}
                            </div>

                            {/* Product */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Produto
                                </label>
                                <select
                                    value={formData.produto}
                                    onChange={(e) => setFormData({ ...formData, produto: e.target.value as Product })}
                                    className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="TRIPS">Trips</option>
                                    <option value="WEDDING">Wedding</option>
                                    <option value="CORP">Corp</option>
                                </select>
                            </div>
                        </section>

                        {/* Section: Assignment */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                                Atribuição
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Responsável
                                </label>
                                <OwnerSelector
                                    value={formData.sdr_owner_id}
                                    onChange={(id, nome) => setFormData({
                                        ...formData,
                                        sdr_owner_id: id,
                                        sdr_owner_nome: nome
                                    })}
                                    product={formData.produto}
                                />
                            </div>
                        </section>

                        {/* Section: Stage Selection */}
                        <section className="space-y-4">
                            <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Etapa Inicial
                            </h3>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                    Criar card em <span className="text-red-500">*</span>
                                </label>
                                {loadingStages ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                                        <span className="ml-2 text-sm text-slate-500">Carregando etapas...</span>
                                    </div>
                                ) : allowedStages.length === 0 ? (
                                    <div className="text-center py-3 px-4 text-sm text-amber-600 bg-amber-50 rounded-lg border border-amber-200">
                                        Nenhuma etapa disponível para seu time.
                                    </div>
                                ) : allowedStages.length === 1 ? (
                                    <div className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg bg-slate-50">
                                        <MapPin className="h-4 w-4 text-emerald-600" />
                                        <span className="text-sm font-medium text-slate-900">{allowedStages[0].nome}</span>
                                        {allowedStages[0].fase && (
                                            <span className="text-xs text-slate-500">({allowedStages[0].fase})</span>
                                        )}
                                    </div>
                                ) : (
                                    <select
                                        value={formData.selectedStageId || ''}
                                        onChange={(e) => setFormData({ ...formData, selectedStageId: e.target.value })}
                                        className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    >
                                        {/* Group stages by phase */}
                                        {Object.entries(
                                            allowedStages.reduce((acc, stage) => {
                                                const phase = stage.fase || 'Outros'
                                                if (!acc[phase]) acc[phase] = []
                                                acc[phase].push(stage)
                                                return acc
                                            }, {} as Record<string, typeof allowedStages>)
                                        ).map(([phase, stages]) => (
                                            <optgroup key={phase} label={phase}>
                                                {stages.map(stage => (
                                                    <option key={stage.id} value={stage.id}>
                                                        {stage.nome}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                )}

                                {isAdmin && (
                                    <p className="mt-1.5 text-xs text-slate-500">
                                        Você tem acesso a todas as etapas (admin).
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={handleClose} disabled={createCardMutation.isPending}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={!canSubmit || createCardMutation.isPending}
                            className={cn(
                                "bg-indigo-600 hover:bg-indigo-700 text-white",
                                (!canSubmit) && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {createCardMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Criando...
                                </>
                            ) : (
                                'Criar Card'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {showContactSelector && (
                <ContactSelector
                    cardId=""
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
