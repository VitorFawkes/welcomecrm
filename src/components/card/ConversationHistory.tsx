import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Mail, ChevronDown, ChevronUp, Sparkles, RefreshCw, Check, CheckCheck } from 'lucide-react'
import { cn } from '../../lib/utils'
import AIChat from './AIChat'
import { toast } from 'sonner'

interface ConversationHistoryProps {
    cardId: string
    contactId?: string | null // Pass contactId to link messages
}

type Tab = 'whatsapp' | 'email' | 'meetings' | 'ai'

export default function ConversationHistory({ cardId, contactId }: ConversationHistoryProps) {
    const queryClient = useQueryClient()
    const [isExpanded, setIsExpanded] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('whatsapp')

    // Realtime Subscription
    useEffect(() => {
        if (!contactId) return

        const channel = supabase
            .channel('whatsapp-realtime')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'whatsapp_messages',
                    filter: `contact_id=eq.${contactId}`
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['conversations-whatsapp', contactId] })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [contactId, queryClient])

    // Fetch WhatsApp conversations (New Table)
    const { data: whatsappData, isLoading: isLoadingWhatsApp } = useQuery({
        queryKey: ['conversations-whatsapp', contactId],
        queryFn: async () => {
            if (!contactId) return []
            const { data, error } = await supabase
                .from('whatsapp_messages')
                .select('*')
                .eq('contact_id', contactId)
                .order('created_at', { ascending: true }) // Chat order

            if (error) throw error
            return data || []
        },
        enabled: isExpanded && activeTab === 'whatsapp' && !!contactId
    })

    // Sync Mutation
    const syncMutation = useMutation({
        mutationFn: async () => {
            if (!contactId) return
            const { error } = await supabase.functions.invoke('sync-whatsapp-history', {
                body: { contact_id: contactId }
            })
            if (error) throw error
        },
        onSuccess: () => {
            toast.success('Histórico sincronizado!')
            queryClient.invalidateQueries({ queryKey: ['conversations-whatsapp', contactId] })
        },
        onError: () => {
            toast.error('Erro ao sincronizar histórico.')
        }
    })

    // Fetch Email conversations (Legacy)
    const { data: emailData } = useQuery({
        queryKey: ['conversations-email', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activities')
                .select('*, profiles:created_by(nome)')
                .eq('card_id', cardId)
                .eq('tipo', 'email')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: isExpanded && activeTab === 'email'
    })

    // Fetch Meeting records (Legacy)
    const { data: meetingsData } = useQuery({
        queryKey: ['conversations-meetings', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activities')
                .select('*, profiles:created_by(nome)')
                .eq('card_id', cardId)
                .eq('tipo', 'meeting_created')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: isExpanded && activeTab === 'meetings'
    })

    return (
        <div className="rounded-lg border bg-white shadow-sm">
            {/* Header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-900">Histórico de Conversas</h3>
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                        {(whatsappData?.length || 0) + (emailData?.length || 0) + (meetingsData?.length || 0)}
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t">
                    {/* Tabs */}
                    <div className="flex border-b bg-gray-50 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('whatsapp')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                activeTab === 'whatsapp'
                                    ? "border-green-500 text-green-700 bg-white"
                                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            )}
                        >
                            <MessageSquare className="h-4 w-4" />
                            WhatsApp
                            {whatsappData && whatsappData.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                    {whatsappData.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('email')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                activeTab === 'email'
                                    ? "border-blue-500 text-blue-700 bg-white"
                                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            )}
                        >
                            <Mail className="h-4 w-4" />
                            E-mail
                        </button>

                        <button
                            onClick={() => setActiveTab('ai')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ml-auto whitespace-nowrap",
                                activeTab === 'ai'
                                    ? "border-indigo-500 text-indigo-700 bg-white"
                                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            )}
                        >
                            <Sparkles className="h-4 w-4" />
                            Chat com IA
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="p-0">
                        {activeTab === 'whatsapp' && (
                            <div className="flex flex-col h-[400px]">
                                {/* Toolbar */}
                                <div className="p-2 border-b flex justify-end bg-gray-50/50">
                                    <button
                                        onClick={() => syncMutation.mutate()}
                                        disabled={syncMutation.isPending || !contactId}
                                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-indigo-600 disabled:opacity-50"
                                    >
                                        <RefreshCw className={cn("w-3 h-3", syncMutation.isPending && "animate-spin")} />
                                        {syncMutation.isPending ? 'Sincronizando...' : 'Sincronizar'}
                                    </button>
                                </div>

                                {/* Messages List */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                                    {!contactId ? (
                                        <div className="text-center text-gray-500 py-8">
                                            Vincule um contato para ver as mensagens.
                                        </div>
                                    ) : isLoadingWhatsApp ? (
                                        <div className="text-center text-gray-500 py-8">Carregando mensagens...</div>
                                    ) : whatsappData?.length === 0 ? (
                                        <div className="text-center text-gray-500 py-8">
                                            Nenhuma mensagem encontrada. Clique em sincronizar.
                                        </div>
                                    ) : (
                                        whatsappData?.map((msg) => {
                                            const isOutbound = msg.direction === 'outbound'
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={cn(
                                                        "flex w-full",
                                                        isOutbound ? "justify-end" : "justify-start"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "max-w-[80%] rounded-lg p-3 text-sm shadow-sm",
                                                            isOutbound
                                                                ? "bg-green-100 text-gray-900 rounded-tr-none"
                                                                : "bg-white text-gray-900 rounded-tl-none border"
                                                        )}
                                                    >
                                                        {msg.type === 'image' || msg.media_url ? (
                                                            <div className="mb-2">
                                                                <img
                                                                    src={msg.media_url || ''}
                                                                    alt="Mídia"
                                                                    className="rounded-md max-h-48 object-cover"
                                                                    onError={(e) => (e.currentTarget.style.display = 'none')}
                                                                />
                                                            </div>
                                                        ) : null}

                                                        <p className="whitespace-pre-wrap">{msg.body}</p>

                                                        <div className="flex items-center justify-end gap-1 mt-1">
                                                            <span className="text-[10px] text-gray-500 opacity-75">
                                                                {new Date(msg.created_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {isOutbound && (
                                                                msg.status === 'read' ? <CheckCheck className="w-3 h-3 text-blue-500" /> :
                                                                    msg.status === 'delivered' ? <CheckCheck className="w-3 h-3 text-gray-400" /> :
                                                                        <Check className="w-3 h-3 text-gray-400" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'email' && (
                            <div className="p-4 space-y-3">
                                {emailData?.map((item: any) => (
                                    <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Mail className="w-4 h-4 text-blue-500" />
                                            <span className="font-medium text-sm">{item.profiles?.nome || 'Sistema'}</span>
                                            <span className="text-xs text-gray-400 ml-auto">
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">{item.descricao}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeTab === 'ai' && <AIChat cardId={cardId} />}
                    </div>
                </div>
            )}
        </div>
    )
}
