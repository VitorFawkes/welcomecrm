import { useState } from 'react'
import { Send, Sparkles } from 'lucide-react'

interface AIChatProps {
    cardId: string
}

export default function AIChat({ cardId }: AIChatProps) {
    const [message, setMessage] = useState('')
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([])

    const handleSend = () => {
        if (!message.trim()) return

        // Add user message
        setChatHistory(prev => [...prev, { role: 'user', content: message }])

        // Simulate AI response (placeholder)
        setTimeout(() => {
            setChatHistory(prev => [...prev, {
                role: 'assistant',
                content: 'Esta funcionalidade será integrada em breve com IA. Por enquanto, você pode visualizar todo o histórico de conversas nas abas acima.'
            }])
        }, 500)

        setMessage('')
    }

    return (
        <div className="flex flex-col h-full">
            {/* Info Banner */}
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-start gap-2">
                    <Sparkles className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-indigo-900">Chat com IA - Em Breve</p>
                        <p className="text-xs text-indigo-700 mt-1">
                            Pergunte qualquer coisa sobre as conversas deste lead. A IA analisará o histórico completo de WhatsApp, e-mails e reuniões para responder.
                        </p>
                    </div>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 space-y-3 mb-4 max-h-60 overflow-y-auto">
                {chatHistory.length === 0 ? (
                    <div className="text-center py-8">
                        <Sparkles className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                        <p className="text-sm text-gray-500">Faça sua primeira pergunta sobre este lead</p>
                        <p className="text-xs text-gray-400 mt-1">Ex: "Quando foi o último contato?" ou "O cliente já definiu o orçamento?"</p>
                    </div>
                ) : (
                    chatHistory.map((msg, idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "p-3 rounded-lg max-w-[85%]",
                                msg.role === 'user'
                                    ? "ml-auto bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-900"
                            )}
                        >
                            <p className="text-sm">{msg.content}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Pergunte sobre as conversas deste lead..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                    onClick={handleSend}
                    disabled={!message.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
    )
}

function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ')
}
