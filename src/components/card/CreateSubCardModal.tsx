import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { GitBranch, Plus, RefreshCw, AlertCircle } from 'lucide-react'
import { useSubCards, type SubCardMode } from '@/hooks/useSubCards'
import { cn } from '@/lib/utils'

interface CreateSubCardModalProps {
    isOpen: boolean
    onClose: () => void
    parentCardId: string
    parentTitle: string
    parentValor?: number | null
}

export default function CreateSubCardModal({
    isOpen,
    onClose,
    parentCardId,
    parentTitle,
    parentValor
}: CreateSubCardModalProps) {
    const { createSubCard, isCreating } = useSubCards()

    const [formData, setFormData] = useState({
        mode: 'incremental' as SubCardMode,
        titulo: '',
        descricao: ''
    })

    const [errors, setErrors] = useState<{ titulo?: string; descricao?: string }>({})

    const handleSubmit = () => {
        // Validate
        const newErrors: typeof errors = {}
        if (!formData.titulo.trim()) {
            newErrors.titulo = 'Título é obrigatório'
        }
        if (!formData.descricao.trim()) {
            newErrors.descricao = 'Descrição é obrigatória para rastrear a solicitação'
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors)
            return
        }

        createSubCard(
            {
                parentId: parentCardId,
                titulo: formData.titulo.trim(),
                descricao: formData.descricao.trim(),
                mode: formData.mode
            },
            {
                onSuccess: () => {
                    handleClose()
                }
            }
        )
    }

    const handleClose = () => {
        setFormData({ mode: 'incremental', titulo: '', descricao: '' })
        setErrors({})
        onClose()
    }

    const formatCurrency = (value: number | null | undefined) => {
        if (value == null) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value)
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[520px] bg-white border-gray-200">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-gray-900">
                        <GitBranch className="w-5 h-5 text-orange-500" />
                        Criar Card de Alteração
                    </DialogTitle>
                    <p className="text-sm text-gray-500 mt-1">
                        Vinculado a: <span className="font-medium text-gray-700">{parentTitle}</span>
                    </p>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            O que você precisa fazer?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Incremental Mode */}
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, mode: 'incremental' }))}
                                className={cn(
                                    'relative p-4 rounded-lg border-2 text-left transition-all',
                                    formData.mode === 'incremental'
                                        ? 'border-orange-500 bg-orange-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                        formData.mode === 'incremental'
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-400'
                                    )}>
                                        <Plus className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className={cn(
                                            'font-semibold text-sm',
                                            formData.mode === 'incremental' ? 'text-orange-700' : 'text-gray-700'
                                        )}>
                                            Adicionar item
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Cotar algo pontual (passeio, transfer, etc)
                                        </p>
                                        <p className={cn(
                                            'text-xs mt-2 font-medium',
                                            formData.mode === 'incremental' ? 'text-orange-600' : 'text-gray-400'
                                        )}>
                                            Valor será SOMADO
                                        </p>
                                    </div>
                                </div>
                                {formData.mode === 'incremental' && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500" />
                                )}
                            </button>

                            {/* Complete Mode */}
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, mode: 'complete' }))}
                                className={cn(
                                    'relative p-4 rounded-lg border-2 text-left transition-all',
                                    formData.mode === 'complete'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                                        formData.mode === 'complete'
                                            ? 'bg-blue-500 text-white'
                                            : 'bg-gray-100 text-gray-400'
                                    )}>
                                        <RefreshCw className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className={cn(
                                            'font-semibold text-sm',
                                            formData.mode === 'complete' ? 'text-blue-700' : 'text-gray-700'
                                        )}>
                                            Refazer proposta
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Alterar viagem toda, nova proposta completa
                                        </p>
                                        <p className={cn(
                                            'text-xs mt-2 font-medium',
                                            formData.mode === 'complete' ? 'text-blue-600' : 'text-gray-400'
                                        )}>
                                            Valor SUBSTITUIRÁ
                                        </p>
                                    </div>
                                </div>
                                {formData.mode === 'complete' && (
                                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Mode Info Box */}
                    <div className={cn(
                        'p-3 rounded-lg text-sm',
                        formData.mode === 'incremental'
                            ? 'bg-orange-50 text-orange-800 border border-orange-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                    )}>
                        {formData.mode === 'incremental' ? (
                            <p>
                                <span className="font-semibold">Modo Incremental:</span> O card de alteração
                                começará com valor R$ 0,00. Ao concluir, o valor será somado ao card principal
                                ({formatCurrency(parentValor)}).
                            </p>
                        ) : (
                            <p>
                                <span className="font-semibold">Modo Completo:</span> O card de alteração
                                herdará todos os dados do card principal, incluindo o valor de {formatCurrency(parentValor)}.
                                Ao concluir, o novo valor substituirá o valor atual.
                            </p>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Título <span className="text-red-500">*</span>
                        </label>
                        <Input
                            type="text"
                            value={formData.titulo}
                            onChange={(e) => {
                                setFormData({ ...formData, titulo: e.target.value })
                                if (errors.titulo) setErrors(prev => ({ ...prev, titulo: undefined }))
                            }}
                            placeholder={formData.mode === 'incremental'
                                ? 'Ex: Adicionar passeio de mergulho'
                                : 'Ex: Refazer proposta - Trocar destino'
                            }
                            className={cn(errors.titulo && 'border-red-500')}
                        />
                        {errors.titulo && (
                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.titulo}
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descrição da alteração <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                            value={formData.descricao}
                            onChange={(e) => {
                                setFormData({ ...formData, descricao: e.target.value })
                                if (errors.descricao) setErrors(prev => ({ ...prev, descricao: undefined }))
                            }}
                            placeholder="Descreva o que o cliente solicitou..."
                            rows={3}
                            className={cn(errors.descricao && 'border-red-500')}
                        />
                        {errors.descricao && (
                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> {errors.descricao}
                            </p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                            Esta descrição será usada para criar uma tarefa de acompanhamento
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isCreating}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isCreating}
                        className={cn(
                            'text-white',
                            formData.mode === 'incremental'
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        )}
                    >
                        {isCreating ? 'Criando...' : 'Criar Card de Alteração'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
