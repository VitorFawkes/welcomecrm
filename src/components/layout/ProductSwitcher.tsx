import { useState } from 'react'
import { Check, ChevronsUpDown, Plane, Heart, Building2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { useProductContext } from '../../hooks/useProductContext'
import type { Database } from '../../database.types'

type Product = Database['public']['Enums']['app_product']

const products: { value: Product; label: string; icon: any; color: string }[] = [
    { value: 'TRIPS', label: 'Welcome Trips', icon: Plane, color: 'text-teal-500' },
    { value: 'WEDDING', label: 'Welcome Wedding', icon: Heart, color: 'text-rose-500' },
    { value: 'CORP', label: 'Welcome Corp', icon: Building2, color: 'text-purple-500' },
]

export function ProductSwitcher() {
    const { currentProduct, setProduct } = useProductContext()
    const [open, setOpen] = useState(false)

    const selectedProduct = products.find((p) => p.value === currentProduct) || products[0]

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <button
                    role="combobox"
                    aria-expanded={open}
                    className="w-full flex items-center justify-between rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20 transition-colors border border-white/10"
                >
                    <div className="flex items-center gap-2">
                        <selectedProduct.icon className={cn("h-4 w-4", selectedProduct.color)} />
                        <span>{selectedProduct.label}</span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px] p-0">
                {products.map((product) => (
                    <DropdownMenuItem
                        key={product.value}
                        onSelect={() => {
                            setProduct(product.value)
                            setOpen(false)
                            // Force reload to ensure context switch is clean across the app
                            window.location.reload()
                        }}
                        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer"
                    >
                        <product.icon className={cn("h-4 w-4", product.color)} />
                        <span className="flex-1">{product.label}</span>
                        {currentProduct === product.value && (
                            <Check className="h-4 w-4 text-primary" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
