import { useState } from 'react'
import KanbanBoard from '../components/pipeline/KanbanBoard'
import type { Database } from '../database.types'
import { cn } from '../lib/utils'

type Product = Database['public']['Enums']['app_product'] | 'ALL'

export default function Pipeline() {
    const [productFilter, setProductFilter] = useState<Product>('ALL')

    return (
        <div className="flex h-full flex-col space-y-4">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-semibold text-gray-900">Pipeline</h1>
                    <p className="mt-1 text-sm text-gray-500">Gerencie suas oportunidades e acompanhe o progresso.</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Vitor Gambetti</p>
                        <p className="text-xs text-gray-500">Admin</p>
                    </div>
                    {/* Logout button could go here if needed, but it's usually in sidebar or profile menu */}
                </div>
            </header>

            <div className="flex items-center justify-between mb-8">
                <div className="flex space-x-2 rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {(['ALL', 'TRIPS', 'WEDDING', 'CORP'] as const).map((prod) => (
                        <button
                            key={prod}
                            onClick={() => setProductFilter(prod)}
                            className={cn(
                                "rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200",
                                productFilter === prod
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-gray-600 hover:bg-primary-light"
                            )}
                        >
                            {prod === 'ALL' ? 'Todos' : prod.charAt(0) + prod.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => alert('Funcionalidade de criação em desenvolvimento')}
                    className="flex items-center rounded-md bg-product-trips px-4 py-2 font-medium text-white shadow-sm transition-colors hover:bg-product-trips/90"
                >
                    <span className="mr-2 text-lg">+</span>
                    Novo Card
                </button>
            </div>

            <div className="flex-1 overflow-hidden">
                <KanbanBoard productFilter={productFilter} />
            </div>
        </div>
    )
}
