import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
    useCreateLibraryItem,
    useUpdateLibraryItem,
    LIBRARY_CATEGORY_CONFIG,
    type LibraryCategory,
    type LibraryItem
} from '@/hooks/useLibrary'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/Select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const schema = z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    description: z.string().optional(),
    category: z.enum(['hotel', 'experience', 'transfer', 'flight', 'service', 'text_block', 'custom'] as const),
    base_price: z.number().min(0).optional(),
})

type FormData = z.infer<typeof schema>

interface LibraryItemFormProps {
    isOpen: boolean
    onClose: () => void
    item?: LibraryItem
}

export function LibraryItemForm({ isOpen, onClose, item }: LibraryItemFormProps) {
    const createItem = useCreateLibraryItem()
    const updateItem = useUpdateLibraryItem()

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting }
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: '',
            description: '',
            category: 'custom',
            base_price: 0,
        }
    })

    const selectedCategory = watch('category')

    useEffect(() => {
        if (isOpen) {
            if (item) {
                reset({
                    name: item.name,
                    description: (item.content as any)?.description || '',
                    category: item.category as LibraryCategory,
                    base_price: item.base_price || 0,
                })
            } else {
                reset({
                    name: '',
                    description: '',
                    category: 'custom',
                    base_price: 0,
                })
            }
        }
    }, [isOpen, item, reset])

    const onSubmit = async (data: FormData) => {
        try {
            if (item) {
                await updateItem.mutateAsync({
                    id: item.id,
                    updates: {
                        name: data.name,
                        category: data.category,
                        base_price: data.base_price,
                        content: { description: data.description },
                    },
                })
                toast.success('Item atualizado com sucesso')
            } else {
                await createItem.mutateAsync({
                    name: data.name,
                    category: data.category,
                    base_price: data.base_price,
                    content: { description: data.description },
                })
                toast.success('Item criado com sucesso')
            }
            onClose()
        } catch (error) {
            console.error('Error saving item:', error)
            toast.error('Erro ao salvar item')
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        {item ? 'Editar Item' : 'Novo Item da Biblioteca'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Nome</label>
                        <Input
                            {...register('name')}
                            placeholder="Ex: Hotel Fasano Rio"
                            className={cn(errors.name && "border-red-500")}
                        />
                        {errors.name && (
                            <p className="text-xs text-red-500">{errors.name.message}</p>
                        )}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Categoria</label>
                        <Select
                            value={selectedCategory}
                            onChange={(value: string) => setValue('category', value as LibraryCategory)}
                            options={Object.entries(LIBRARY_CATEGORY_CONFIG).map(([key, config]) => ({
                                value: key,
                                label: config.label,
                            }))}
                            placeholder="Selecione uma categoria"
                        />
                        {errors.category && (
                            <p className="text-xs text-red-500">{errors.category.message}</p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Descrição</label>
                        <Textarea
                            {...register('description')}
                            placeholder="Descrição detalhada do item..."
                            className="h-24 resize-none"
                        />
                    </div>

                    {/* Price */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Preço Base (R$)</label>
                        <Input
                            type="number"
                            step="0.01"
                            {...register('base_price', { valueAsNumber: true })}
                            placeholder="0,00"
                        />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            {item ? 'Salvar Alterações' : 'Criar Item'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
