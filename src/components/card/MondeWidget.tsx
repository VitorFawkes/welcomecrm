import { useState } from 'react'
import {
    Building2,
    Plus,
    ChevronRight,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    RefreshCw,
    Ban,
    Eye
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import {
    useMondeSalesByCard,
    useCancelMondeSale,
    useRetryMondeSale,
    getMondeSaleStatusInfo,
    type MondeSaleWithItems,
    type MondeSaleStatus
} from '@/hooks/useMondeSales'
import MondeCreateSaleModal from './MondeCreateSaleModal'

interface MondeWidgetProps {
    cardId: string
    proposalId?: string | null
    hasAcceptedProposal: boolean
}

export default function MondeWidget({
    cardId,
    proposalId,
    hasAcceptedProposal
}: MondeWidgetProps) {
    const navigate = useNavigate()
    const { data: sales, isLoading } = useMondeSalesByCard(cardId)
    const { mutate: cancelSale, isPending: isCancelling } = useCancelMondeSale()
    const { mutate: retrySale, isPending: isRetrying } = useRetryMondeSale()

    const [showCreateModal, setShowCreateModal] = useState(false)
    const [expandedSection, setExpandedSection] = useState<'pending' | 'sent' | 'failed' | null>('pending')

    const pendingSales = (sales || []).filter(s => s.status === 'pending' || s.status === 'processing')
    const sentSales = (sales || []).filter(s => s.status === 'sent')
    const failedSales = (sales || []).filter(s => s.status === 'failed')

    const totalSent = sentSales.reduce((sum, s) => sum + (s.total_value || 0), 0)

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    <h3 className="text-sm font-semibold text-gray-900">
                        Vendas Monde
                    </h3>
                    {sentSales.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                            {sentSales.length} enviada(s)
                        </span>
                    )}
                </div>

                {hasAcceptedProposal && proposalId && (
                    <div className="flex items-center gap-1">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/cards/${cardId}/monde-preview?proposalId=${proposalId}`)}
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                            <Eye className="w-3 h-3 mr-1" />
                            Preview
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCreateModal(true)}
                            className="text-xs"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Nova Venda
                        </Button>
                    </div>
                )}
            </div>

            {/* Summary */}
            {sentSales.length > 0 && (
                <div className="flex items-center gap-4 p-3 bg-green-50 rounded-lg border border-green-100">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                        <p className="text-sm font-medium text-green-900">
                            {sentSales.length} venda(s) enviada(s)
                        </p>
                        <p className="text-xs text-green-700">
                            Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSent)}
                        </p>
                    </div>
                </div>
            )}

            {/* Pending Sales */}
            {pendingSales.length > 0 && (
                <SalesSection
                    title="Aguardando Envio"
                    count={pendingSales.length}
                    icon={<Clock className="w-3 h-3" />}
                    iconColor="text-yellow-500"
                    isExpanded={expandedSection === 'pending'}
                    onToggle={() => setExpandedSection(expandedSection === 'pending' ? null : 'pending')}
                >
                    {pendingSales.map(sale => (
                        <SaleItem
                            key={sale.id}
                            sale={sale}
                            onCancel={() => cancelSale({ saleId: sale.id, cardId })}
                            isCancelling={isCancelling}
                        />
                    ))}
                </SalesSection>
            )}

            {/* Failed Sales */}
            {failedSales.length > 0 && (
                <SalesSection
                    title="Falha no Envio"
                    count={failedSales.length}
                    icon={<AlertCircle className="w-3 h-3" />}
                    iconColor="text-red-500"
                    isExpanded={expandedSection === 'failed'}
                    onToggle={() => setExpandedSection(expandedSection === 'failed' ? null : 'failed')}
                >
                    {failedSales.map(sale => (
                        <SaleItem
                            key={sale.id}
                            sale={sale}
                            onRetry={() => retrySale({ saleId: sale.id, cardId })}
                            onCancel={() => cancelSale({ saleId: sale.id, cardId })}
                            isRetrying={isRetrying}
                            isCancelling={isCancelling}
                            showError
                        />
                    ))}
                </SalesSection>
            )}

            {/* Sent Sales */}
            {sentSales.length > 0 && (
                <SalesSection
                    title="Enviadas"
                    count={sentSales.length}
                    icon={<CheckCircle2 className="w-3 h-3" />}
                    iconColor="text-green-500"
                    isExpanded={expandedSection === 'sent'}
                    onToggle={() => setExpandedSection(expandedSection === 'sent' ? null : 'sent')}
                    defaultCollapsed
                >
                    {sentSales.map(sale => (
                        <SaleItem key={sale.id} sale={sale} />
                    ))}
                </SalesSection>
            )}

            {/* Empty State */}
            {(sales || []).length === 0 && (
                <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <Building2 className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-500">
                        Nenhuma venda enviada para o Monde
                    </p>
                    {hasAcceptedProposal && proposalId ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowCreateModal(true)}
                            className="mt-3 text-xs"
                        >
                            <Plus className="w-3 h-3 mr-1" />
                            Criar primeira venda
                        </Button>
                    ) : (
                        <p className="text-xs text-gray-400 mt-1">
                            Aceite uma proposta para enviar vendas
                        </p>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && proposalId && (
                <MondeCreateSaleModal
                    cardId={cardId}
                    proposalId={proposalId}
                    onClose={() => setShowCreateModal(false)}
                />
            )}
        </div>
    )
}

// ============================================
// SalesSection Component
// ============================================
interface SalesSectionProps {
    title: string
    count: number
    icon: React.ReactNode
    iconColor: string
    isExpanded: boolean
    onToggle: () => void
    defaultCollapsed?: boolean
    children: React.ReactNode
}

function SalesSection({
    title,
    count,
    icon,
    iconColor,
    isExpanded,
    onToggle,
    children
}: SalesSectionProps) {
    return (
        <div className="space-y-2">
            <button
                onClick={onToggle}
                className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 w-full"
            >
                <ChevronRight className={cn(
                    'w-3 h-3 transition-transform',
                    isExpanded && 'rotate-90'
                )} />
                <span className={iconColor}>{icon}</span>
                <span>{title} ({count})</span>
            </button>

            {isExpanded && (
                <div className="space-y-2 pl-4">
                    {children}
                </div>
            )}
        </div>
    )
}

// ============================================
// SaleItem Component
// ============================================
interface SaleItemProps {
    sale: MondeSaleWithItems
    onCancel?: () => void
    onRetry?: () => void
    isCancelling?: boolean
    isRetrying?: boolean
    showError?: boolean
}

function SaleItem({
    sale,
    onCancel,
    onRetry,
    isCancelling,
    isRetrying,
    showError
}: SaleItemProps) {
    const statusInfo = getMondeSaleStatusInfo(sale.status as MondeSaleStatus)
    const formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: sale.currency || 'BRL'
    }).format(sale.total_value || 0)

    const formattedDate = new Date(sale.sale_date).toLocaleDateString('pt-BR')

    return (
        <div className="p-3 bg-white rounded-lg border border-gray-200 space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            statusInfo.color
                        )}>
                            {statusInfo.label}
                        </span>
                        {sale.monde_sale_id && (
                            <span className="text-xs text-gray-500">
                                #{sale.monde_sale_number || sale.monde_sale_id.substring(0, 8)}
                            </span>
                        )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                        {formattedValue}
                    </p>
                    <p className="text-xs text-gray-500">
                        Data: {formattedDate} • {sale.items?.length || 0} item(s)
                    </p>
                </div>
            </div>

            {/* Error message */}
            {showError && sale.error_message && (
                <div className="p-2 bg-red-50 rounded text-xs text-red-700">
                    {sale.error_message.substring(0, 100)}
                    {sale.error_message.length > 100 && '...'}
                </div>
            )}

            {/* Items preview */}
            {sale.items && sale.items.length > 0 && (
                <div className="text-xs text-gray-500 space-y-0.5">
                    {sale.items.slice(0, 3).map(item => (
                        <div key={item.id} className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="truncate">{item.title}</span>
                            {item.supplier && (
                                <span className="text-gray-400">({item.supplier})</span>
                            )}
                        </div>
                    ))}
                    {sale.items.length > 3 && (
                        <span className="text-gray-400">
                            +{sale.items.length - 3} mais...
                        </span>
                    )}
                </div>
            )}

            {/* Actions */}
            {(onCancel || onRetry) && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    {onRetry && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRetry}
                            disabled={isRetrying}
                            className="text-xs flex-1"
                        >
                            {isRetrying ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : (
                                <RefreshCw className="w-3 h-3 mr-1" />
                            )}
                            Tentar Novamente
                        </Button>
                    )}
                    {onCancel && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onCancel}
                            disabled={isCancelling}
                            className="text-xs text-gray-500 hover:text-red-600"
                        >
                            {isCancelling ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <Ban className="w-3 h-3" />
                            )}
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}
