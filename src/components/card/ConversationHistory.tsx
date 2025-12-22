import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { MessageSquare, Mail, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'
import AIChat from './AIChat'

interface ConversationHistoryProps {
    cardId: string
}

type Tab = 'whatsapp' | 'email' | 'meetings' | 'ai'

export default function ConversationHistory({ cardId }: ConversationHistoryProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('whatsapp')

    // Fetch WhatsApp conversations
    const { data: whatsappData } = useQuery({
        queryKey: ['conversations-whatsapp', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('atividades')
                .select('*, profiles:created_by(nome)')
                .eq('card_id', cardId)
                .eq('tipo', 'whatsapp')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: isExpanded && activeTab === 'whatsapp'
    })

    // Fetch Email conversations
    const { data: emailData } = useQuery({
        queryKey: ['conversations-email', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('atividades')
                .select('*, profiles:created_by(nome)')
                .eq('card_id', cardId)
                .eq('tipo', 'email')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: isExpanded && activeTab === 'email'
    })

    // Fetch Meeting records
    const { data: meetingsData } = useQuery({
        queryKey: ['conversations-meetings', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('atividades')
                .select('*, profiles:created_by(nome)')
                .eq('card_id', cardId)
                .eq('tipo', 'reuniao')
                .order('created_at', { ascending: false })

            if (error) throw error
            return data || []
        },
        enabled: isExpanded && activeTab === 'meetings'
    })

    const getCurrentData = () => {
        switch (activeTab) {
            case 'whatsapp': return whatsappData || []
            case 'email': return emailData || []
            case 'meetings': return meetingsData || []
            default: return []
        }
    }

    const currentData = getCurrentData()

    return (
        <div className="rounded-lg border bg-white shadow-sm">
            {/* Header - Always Visible */}
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
                    <div className="flex border-b bg-gray-50">
                        <button
                            onClick={() => setActiveTab('whatsapp')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
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
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                                activeTab === 'email'
                                    ? "border-blue-500 text-blue-700 bg-white"
                                    : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            )}
                        >
                            <Mail className="h-4 w-4" />
                            E-mail
                            {emailData && emailData.length > 0 && (
                                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                                    {emailData.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab('ai')}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ml-auto",
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
                    <div className="p-4">
                        {activeTab === 'ai' ? (
                            <AIChat cardId={cardId} />
                        ) : (
                            <div className="space-y-3">
                                {currentData.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <p className="text-sm">Nenhuma conversa registrada ainda</p>
                                    </div>
                                ) : (
                                    currentData.map((item: any) => {
                                        const author = item.profiles as any
                                        return (
                                            <div key={item.id} className="border rounded-lg p-3 hover:bg-gray-50">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                                                            {author?.nome?.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">
                                                                {author?.nome || 'Usuário'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {item.created_at && new Date(item.created_at).toLocaleDateString('pt-BR', {
                                                                    day: '2-digit',
                                                                    month: 'short',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 mb-1">{item.titulo}</p>
                                                {item.descricao && (
                                                    <p className="text-sm text-gray-600">{item.descricao}</p>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
