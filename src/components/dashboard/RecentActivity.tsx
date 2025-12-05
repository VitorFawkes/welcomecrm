import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Activity {
    id: string
    tipo: string
    descricao: string
    created_at: string
    card?: {
        titulo: string
    }
}

export default function RecentActivity() {
    const { data: activities, isLoading } = useQuery({
        queryKey: ['recent-activity'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cards_historico')
                .select(`
                    id,
                    tipo,
                    descricao,
                    created_at,
                    card:cards (
                        titulo
                    )
                `)
                .order('created_at', { ascending: false })
                .limit(10)

            if (error) throw error
            return data as unknown as Activity[]
        }
    })

    if (isLoading) return <div className="h-64 animate-pulse bg-gray-100 rounded-lg"></div>

    return (
        <div className="rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Atividades Recentes</h3>
            <div className="flow-root">
                <ul role="list" className="-mb-8">
                    {activities?.map((activity, activityIdx) => (
                        <li key={activity.id}>
                            <div className="relative pb-8">
                                {activityIdx !== activities.length - 1 ? (
                                    <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                                ) : null}
                                <div className="relative flex space-x-3">
                                    <div>
                                        <span className="h-8 w-8 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                                            <div className="h-2.5 w-2.5 rounded-full bg-white" />
                                        </span>
                                    </div>
                                    <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                        <div>
                                            <p className="text-sm text-gray-500">
                                                <span className="font-medium text-gray-900">{activity.tipo}</span>
                                                {' em '}
                                                <span className="font-medium text-gray-900">{activity.card?.titulo || 'Sem título'}</span>
                                            </p>
                                            <p className="text-sm text-gray-500">{activity.descricao}</p>
                                        </div>
                                        <div className="whitespace-nowrap text-right text-sm text-gray-500">
                                            {activity.created_at && formatDistanceToNow(new Date(activity.created_at), { locale: ptBR, addSuffix: true })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {activities?.length === 0 && (
                        <p className="text-sm text-gray-500">Nenhuma atividade recente.</p>
                    )}
                </ul>
            </div>
        </div>
    )
}
