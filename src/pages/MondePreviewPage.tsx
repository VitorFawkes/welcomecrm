import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
    ArrowLeft,
    Building2,
    Check,
    Clipboard,
    Loader2,
    AlertTriangle,
    ShieldCheck,
    FileJson,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useMondePreview } from '@/hooks/useMondeSales'
import MondeItemCard from '@/components/monde/MondeItemCard'

export default function MondePreviewPage() {
    const { id: cardId } = useParams<{ id: string }>()
    const [searchParams] = useSearchParams()
    const proposalId = searchParams.get('proposalId')
    const navigate = useNavigate()
    const [copied, setCopied] = useState(false)
    const [showPayload, setShowPayload] = useState(false)

    const { data: preview, isLoading, error } = useMondePreview(cardId, proposalId || undefined)

    const handleCopyPayload = () => {
        if (!preview) return
        navigator.clipboard.writeText(JSON.stringify(preview.full_payload, null, 2))
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
                    <p className="text-gray-500">Gerando preview da integração Monde...</p>
                </div>
            </div>
        )
    }

    if (error || !preview) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4 max-w-md">
                    <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
                    <h2 className="text-lg font-semibold text-gray-900">Erro ao gerar preview</h2>
                    <p className="text-gray-500 text-sm">
                        {error instanceof Error ? error.message : 'Nao foi possivel gerar o preview. Verifique se o card possui uma proposta aceita.'}
                    </p>
                    <Button variant="outline" onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                </div>
            </div>
        )
    }

    const unmappedCount = preview.items_preview.filter(i => i.monde_type === 'nao_mapeado').length

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <button
                        onClick={() => navigate(`/cards/${cardId}`)}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar ao card
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Building2 className="w-6 h-6 text-indigo-600" />
                        Preview Monde
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {preview.card.titulo}
                    </p>
                </div>
            </div>

            {/* Status cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white rounded-lg border p-3">
                    <div className="text-xs text-gray-400 uppercase">Proposta</div>
                    <div className="text-sm font-semibold text-green-700 mt-1">
                        {preview.proposal.status === 'accepted' ? 'Aceita' : preview.proposal.status}
                    </div>
                </div>
                <div className="bg-white rounded-lg border p-3">
                    <div className="text-xs text-gray-400 uppercase">Produtos</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">
                        {preview.items_count} item(s)
                    </div>
                </div>
                <div className="bg-white rounded-lg border p-3">
                    <div className="text-xs text-gray-400 uppercase">Valor Total</div>
                    <div className="text-sm font-semibold text-indigo-600 mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preview.total_value)}
                    </div>
                </div>
                <div className="bg-white rounded-lg border p-3">
                    <div className="text-xs text-gray-400 uppercase">Modo</div>
                    <div className="text-sm font-semibold mt-1 flex items-center gap-1">
                        {preview.shadow_mode ? (
                            <span className="text-yellow-700">Shadow (teste)</span>
                        ) : (
                            <span className="text-green-700">Producao</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Warnings */}
            {!preview.cnpj_configured && (
                <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span><strong>CNPJ nao configurado.</strong> Configure o MONDE_CNPJ em integration_settings antes de enviar.</span>
                </div>
            )}
            {unmappedCount > 0 && (
                <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span><strong>{unmappedCount} item(s) sem mapeamento Monde.</strong> Tipos como "experience" ou "service" nao possuem equivalente direto na API Monde.</span>
                </div>
            )}

            {/* Operation ID */}
            <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-semibold text-gray-700">Identificação da Venda</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-gray-400">operation_id</span>
                        <p className="font-mono text-indigo-700 font-medium">WC-{cardId?.substring(0, 8)}</p>
                    </div>
                    <div>
                        <span className="text-gray-400">company_identifier</span>
                        <p className="font-mono text-indigo-700 font-medium">
                            {preview.cnpj_configured ? (preview.full_payload as any).company_identifier : 'NAO CONFIGURADO'}
                        </p>
                    </div>
                    {preview.travel_agent && (
                        <div>
                            <span className="text-gray-400">travel_agent</span>
                            <p className="font-medium text-gray-900">{preview.travel_agent.name}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Items preview - side by side */}
            <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    Mapeamento dos Produtos
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        CRM → Monde API
                    </span>
                </h2>
                <div className="space-y-4">
                    {preview.items_preview.map((item, index) => (
                        <MondeItemCard key={item.crm.id} item={item} index={index} />
                    ))}
                </div>
            </div>

            {/* Full payload */}
            <div className="bg-white rounded-lg border overflow-hidden">
                <button
                    onClick={() => setShowPayload(!showPayload)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <FileJson className="w-5 h-5 text-gray-600" />
                        <h3 className="text-sm font-semibold text-gray-700">
                            Payload JSON Completo
                        </h3>
                        <span className="text-xs text-gray-400">
                            POST /api/v3/sales
                        </span>
                    </div>
                    <span className="text-xs text-indigo-600">
                        {showPayload ? 'Ocultar' : 'Expandir'}
                    </span>
                </button>

                {showPayload && (
                    <div className="border-t">
                        <div className="flex justify-end p-2 bg-gray-900">
                            <button
                                onClick={handleCopyPayload}
                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3 h-3 text-green-400" />
                                        <span className="text-green-400">Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <Clipboard className="w-3 h-3" />
                                        Copiar
                                    </>
                                )}
                            </button>
                        </div>
                        <pre className="bg-gray-900 text-green-400 p-4 text-xs overflow-x-auto max-h-96 overflow-y-auto">
                            {JSON.stringify(preview.full_payload, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* Footer actions */}
            <div className="flex items-center justify-between py-4 border-t">
                <Button variant="outline" onClick={() => navigate(`/cards/${cardId}`)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar ao Card
                </Button>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                    {preview.shadow_mode && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Shadow Mode Ativo</span>
                    )}
                </div>
            </div>
        </div>
    )
}
