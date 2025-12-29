import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Search, Link as LinkIcon, AlertCircle, Check } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface LinkExistingCardModalProps {
    isOpen: boolean
    onClose: () => void
    parentCardId: string
    onLinkSuccess?: () => void
}

export default function LinkExistingCardModal({ isOpen, onClose, parentCardId, onLinkSuccess }: LinkExistingCardModalProps) {
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
    const [debouncedSearch, setDebouncedSearch] = useState('')

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Search Query
    const { data: searchResults, isLoading } = useQuery({
        queryKey: ['search-cards-to-link', debouncedSearch],
        queryFn: async () => {
            if (!debouncedSearch || debouncedSearch.length < 3) return []

            const { data, error } = await supabase
                .from('cards')
                .select('id, titulo, status_comercial, produto, valor_estimado, parent_card_id')
                .ilike('titulo', `%${debouncedSearch}%`)
                .neq('id', parentCardId) // Don't link to self
                .is('parent_card_id', null) // Only unlinked cards
                .limit(10)

            if (error) throw error
            return data
        },
        enabled: debouncedSearch.length >= 3
    })

    // Link Mutation
    const linkCardMutation = useMutation({
        mutationFn: async () => {
            if (!selectedCardId) return

            const { error } = await supabase
                .from('cards')
                .update({ parent_card_id: parentCardId })
                .eq('id', selectedCardId)

            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cards'] })
            if (onLinkSuccess) onLinkSuccess()
            onClose()
            setSearchTerm('')
            setSelectedCardId(null)
        }
    })

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-white/90 backdrop-blur-xl border-white/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <LinkIcon className="w-5 h-5 text-blue-500" />
                        Vincular Card Existente
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Buscar por título do card..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                            autoFocus
                        />
                    </div>

                    <div className="min-h-[200px] max-h-[300px] overflow-y-auto border border-gray-100 rounded-lg bg-white/50">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                Buscando...
                            </div>
                        ) : searchResults?.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm p-4">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                <p>Nenhum card encontrado.</p>
                                <p className="text-xs text-gray-400 mt-1">Tente buscar por outro termo.</p>
                            </div>
                        ) : !debouncedSearch ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm p-4">
                                <Search className="w-8 h-8 mb-2 opacity-50" />
                                <p>Digite para buscar cards disponíveis.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {searchResults?.map((card) => (
                                    <div
                                        key={card.id}
                                        onClick={() => setSelectedCardId(card.id)}
                                        className={cn(
                                            "p-3 cursor-pointer transition-colors hover:bg-blue-50 flex items-center justify-between group",
                                            selectedCardId === card.id ? "bg-blue-50 border-l-4 border-blue-500" : "border-l-4 border-transparent"
                                        )}
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900 group-hover:text-blue-700">
                                                {card.titulo}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {card.produto}
                                                </span>
                                                {card.valor_estimado && (
                                                    <span className="text-xs text-gray-500">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(card.valor_estimado)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {selectedCardId === card.id && (
                                            <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-sm">
                                                <Check className="w-3.5 h-3.5" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => linkCardMutation.mutate()}
                        disabled={!selectedCardId || linkCardMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        {linkCardMutation.isPending ? 'Vinculando...' : 'Vincular Card'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
