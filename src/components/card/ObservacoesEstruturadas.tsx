import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Check, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import { cn } from '../../lib/utils'

type Card = Database['public']['Views']['view_cards_acoes']['Row']
type SystemField = Database['public']['Tables']['system_fields']['Row']

interface ObservacoesEstruturadasProps {
    card: Card
}

export default function ObservacoesEstruturadas({ card }: ObservacoesEstruturadasProps) {
    const queryClient = useQueryClient()
    const productData = (card.produto_data as any) || {}
    const observacoes = (productData as any).observacoes_criticas || {}

    const [editedObs, setEditedObs] = useState(observacoes)
    const [lastSavedObs, setLastSavedObs] = useState(observacoes)
    const [isDirty, setIsDirty] = useState(false)

    // Fetch system fields for this section
    const { data: fields = [] } = useQuery({
        queryKey: ['system-fields', 'observacoes_criticas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('system_fields')
                .select('*')
                .eq('section', 'observacoes_criticas')
                .eq('active', true)
                .order('created_at', { ascending: true }) // Ideally we should have an 'order' column

            if (error) throw error
            return data as SystemField[]
        }
    })

    // Sync state when card changes
    useEffect(() => {
        const obs = (card.produto_data as any)?.observacoes_criticas || {}
        setEditedObs(obs)
        setLastSavedObs(obs)
        setIsDirty(false)
    }, [card.produto_data])

    const updateObsMutation = useMutation({
        mutationFn: async (newObs: any) => {
            const { error } = await (supabase.from('cards') as any)
                .update({
                    produto_data: {
                        ...productData,
                        observacoes_criticas: newObs
                    }
                })
                .eq('id', card.id)
            if (error) throw error
        },
        onSuccess: (_, newObs) => {
            queryClient.invalidateQueries({ queryKey: ['card', card.id!] })
            setLastSavedObs(newObs)
            setIsDirty(false)
        }
    })

    const handleSave = useCallback(() => {
        updateObsMutation.mutate(editedObs)
    }, [editedObs, updateObsMutation])

    const handleChange = (fieldKey: string, value: any) => {
        const newObs = { ...editedObs, [fieldKey]: value }
        setEditedObs(newObs)
        setIsDirty(JSON.stringify(newObs) !== JSON.stringify(lastSavedObs))
    }

    // Handle Enter to save (Shift+Enter for new line)
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Only save on Enter for non-textarea inputs
            // For textareas, we want Enter to be a new line
            const target = e.target as HTMLElement
            if (target.tagName !== 'TEXTAREA') {
                e.preventDefault()
                handleSave()
            }
        }
    }

    const renderFieldInput = (field: SystemField) => {
        const value = editedObs[field.key] || ''
        const options = (field.options as any[]) || []

        switch (field.type) {
            case 'textarea':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow resize-none bg-gray-50/50 focus:bg-white min-h-[80px]"
                        placeholder={field.label}
                    />
                )
            case 'select':
                return (
                    <select
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    >
                        <option value="">Selecione...</option>
                        {options.map((opt: any, idx: number) => (
                            <option key={idx} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                )
            case 'boolean':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) => handleChange(field.key, e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{value ? 'Sim' : 'Não'}</span>
                    </div>
                )
            default: // text, number, currency, etc.
                return (
                    <input
                        type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                        value={value}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow bg-gray-50/50 focus:bg-white"
                        placeholder={field.label}
                    />
                )
        }
    }

    if (fields.length === 0) {
        return (
            <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-gray-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Informações Importantes</h3>
                </div>
                <p className="text-xs text-gray-500 italic">Nenhum campo configurado nesta seção.</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-gray-300 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-100 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900">Informações Importantes</h3>
                </div>
                {updateObsMutation.isPending ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Salvando...
                    </div>
                ) : isDirty ? (
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-colors"
                    >
                        <Check className="h-3 w-3" />
                        Salvar Alterações
                    </button>
                ) : updateObsMutation.isSuccess ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                        <Check className="h-3 w-3" />
                        Salvo
                    </div>
                ) : null}
            </div>

            <div className="space-y-4" onKeyDown={handleKeyDown}>
                {fields.map((field) => (
                    <div key={field.key}>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-2">
                            {/* We can add icons dynamically if we store them in metadata, for now use a generic dot or specific logic */}
                            <div className={cn("w-1.5 h-1.5 rounded-full",
                                field.key === 'o_que_e_importante' ? "bg-red-500" :
                                    field.key === 'o_que_nao_pode_dar_errado' ? "bg-orange-500" :
                                        field.key === 'sensibilidades' ? "bg-yellow-500" : "bg-gray-400"
                            )} />
                            {field.label}
                        </label>
                        {renderFieldInput(field)}
                    </div>
                ))}
            </div>
        </div>
    )
}
