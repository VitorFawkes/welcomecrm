import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import type { Database } from '../../database.types'
import { DollarSign, Layers } from 'lucide-react'

type Product = Database['public']['Enums']['app_product']

interface StatsCardsProps {
    productFilter?: Product | 'ALL'
}

export default function StatsCards({ productFilter = 'ALL' }: StatsCardsProps) {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-stats', productFilter],
        queryFn: async () => {
            let query = supabase
                .from('view_dashboard_funil')
                .select('*')

            if (productFilter !== 'ALL') {
                query = query.eq('produto', productFilter)
            }

            const { data, error } = await query
            if (error) throw error
            return data
        }
    })

    const stats = (data as any[])?.reduce((acc, curr) => ({
        totalCards: acc.totalCards + (curr.total_cards || 0),
        totalValue: acc.totalValue + (curr.total_valor_estimado || 0)
    }), { totalCards: 0, totalValue: 0 }) || { totalCards: 0, totalValue: 0 }

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100"></div>
                ))}
            </div>
        )
    }

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="flex items-center">
                    <div className="rounded-md bg-indigo-50 p-3">
                        <Layers className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total de Cards</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats.totalCards}</p>
                    </div>
                </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
                <div className="flex items-center">
                    <div className="rounded-md bg-green-50 p-3">
                        <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Valor em Pipeline</p>
                        <p className="text-2xl font-semibold text-gray-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalValue)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
