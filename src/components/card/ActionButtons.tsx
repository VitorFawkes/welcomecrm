import { useState } from 'react'
import { Mail, X, Send } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import ProposalBuilderModal from './ProposalBuilderModal'

type Card = Database['public']['Views']['view_cards_acoes']['Row']

interface ActionButtonsProps {
    card: Card
}

export default function ActionButtons({ card }: ActionButtonsProps) {
    const queryClient = useQueryClient()
    const [showEmailModal, setShowEmailModal] = useState(false)
    const [showProposalModal, setShowProposalModal] = useState(false)
    const [emailData, setEmailData] = useState({
        to: '',
        subject: '',
        body: ''
    })

    const logActivityMutation = useMutation({
        mutationFn: async (activity: { tipo: string; descricao: string; metadata?: any }) => {
            const { error } = await (supabase.from('activities') as any)
                .insert({
                    card_id: card.id,
                    tipo: activity.tipo,
                    descricao: activity.descricao,
                    metadata: activity.metadata,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                })

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['activity-feed', card.id] })
        }
    })

    // Fetch primary contact details
    const { data: contact } = useQuery({
        queryKey: ['contact', card.pessoa_principal_id],
        queryFn: async () => {
            if (!card.pessoa_principal_id) return null
            const { data, error } = await supabase
                .from('contatos')
                .select('email, telefone')
                .eq('id', card.pessoa_principal_id)
                .single()

            if (error) throw error
            return data
        },
        enabled: !!card.pessoa_principal_id
    })

    const syncWhatsAppMutation = useMutation({
        mutationFn: async (contactId: string) => {
            const { data, error } = await supabase.functions.invoke('sync-whatsapp-history', {
                body: { contact_id: contactId }
            })
            if (error) throw error
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations-whatsapp'] })
        }
    })

    const handleWhatsAppClick = async () => {
        if (!contact?.telefone) {
            alert('Este contato não possui telefone cadastrado.')
            return
        }

        // Remove non-numeric characters
        const cleanNumber = contact.telefone.replace(/\D/g, '')
        const message = encodeURIComponent(`Olá! Sobre sua viagem: ${card.titulo}`)

        // Optimistic UI: Log activity immediately
        logActivityMutation.mutate({
            tipo: 'whatsapp_sent',
            descricao: 'WhatsApp enviado para o cliente',
            metadata: { contact_id: card.pessoa_principal_id, phone: cleanNumber }
        })

        // Trigger Handshake (Sync) in background
        if (card.pessoa_principal_id) {
            syncWhatsAppMutation.mutate(card.pessoa_principal_id)
        }

        // Open WhatsApp Web
        window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank')
    }

    const handleEmailSend = () => {
        logActivityMutation.mutate({
            tipo: 'email_sent',
            descricao: `Email enviado: ${emailData.subject}`,
            metadata: { to: emailData.to, subject: emailData.subject }
        })

        setShowEmailModal(false)
        setEmailData({ to: '', subject: '', body: '' })
    }

    // Pre-fill email when opening modal
    const openEmailModal = () => {
        if (contact?.email) {
            setEmailData(prev => ({ ...prev, to: contact.email || '' }))
        }
        setShowEmailModal(true)
    }

    return (
        <>
            <div className="flex gap-2">
                <button
                    onClick={handleWhatsAppClick}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                    title="Enviar WhatsApp"
                >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    WhatsApp
                </button>

                <button
                    onClick={openEmailModal}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    title="Enviar Email"
                >
                    <Mail className="h-4 w-4" />
                    Email
                </button>

                <button
                    onClick={() => setShowProposalModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                    title="Gerar Proposta"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Proposta
                </button>
            </div>

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Enviar Email</h3>
                            <button
                                onClick={() => setShowEmailModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Para</label>
                                <input
                                    type="email"
                                    value={emailData.to}
                                    onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="cliente@exemplo.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Assunto</label>
                                <input
                                    type="text"
                                    value={emailData.subject}
                                    onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Sobre sua viagem..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensagem</label>
                                <textarea
                                    value={emailData.body}
                                    onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={6}
                                    placeholder="Digite sua mensagem..."
                                />
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleEmailSend}
                                    disabled={!emailData.to || !emailData.subject}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-4 w-4" />
                                    Enviar
                                </button>
                                <button
                                    onClick={() => setShowEmailModal(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ProposalBuilderModal
                cardId={card.id!}
                isOpen={showProposalModal}
                onClose={() => setShowProposalModal(false)}
            />
        </>
    )
}
