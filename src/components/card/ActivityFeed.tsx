import { Pencil, Plus, UserPlus, FileText, X, Check, TrendingUp, UserCheck, ArrowRightLeft, Mail, MessageSquare } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Database } from '../../database.types'

interface ActivityFeedProps {
    cardId: string
}

type Activity = Database['public']['Tables']['activities']['Row'] & {
    created_by_profile?: {
        nome: string | null
    }
}

const activityIcons = {
    'task_created': FileText,
    'task_completed': Check,
    'task_cancelled': X,
    'status_changed': TrendingUp,
    'owner_changed': UserCheck,
    'stage_changed': ArrowRightLeft,
    'traveler_added': UserPlus,
    'email_sent': Mail,
    'whatsapp_sent': MessageSquare,
    'note_added': Pencil,
    'created': Plus,
    'updated': Pencil,
    'default': FileText
}

const activityColors = {
    'task_created': 'text-blue-600 bg-blue-50',
    'task_completed': 'text-green-600 bg-green-50',
    'task_cancelled': 'text-red-600 bg-red-50',
    'status_changed': 'text-purple-600 bg-purple-50',
    'owner_changed': 'text-indigo-600 bg-indigo-50',
    'stage_changed': 'text-cyan-600 bg-cyan-50',
    'traveler_added': 'text-purple-600 bg-purple-50',
    'email_sent': 'text-blue-600 bg-blue-50',
    'whatsapp_sent': 'text-green-600 bg-green-50',
    'note_added': 'text-gray-600 bg-gray-50',
    'created': 'text-green-600 bg-green-50',
    'updated': 'text-blue-600 bg-blue-50',
    'default': 'text-gray-600 bg-gray-50'
}

export default function ActivityFeed({ cardId }: ActivityFeedProps) {
    const { data: activities, isLoading } = useQuery({
        queryKey: ['activity-feed', cardId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('activities')
                .select(`
                    *,
                    created_by_profile:created_by(nome)
                `)
                .eq('card_id', cardId)
                .order('created_at', { ascending: false })
                .limit(20)

            if (error) {
                console.error('Error fetching activities:', error)
                return []
            }

            return data as Activity[]
        },
        enabled: !!cardId
    })

    if (isLoading) {
        return (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Atividades</h3>
                <p className="text-xs text-gray-500">Carregando...</p>
            </div>
        )
    }

    return (
        <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Atividades Recentes</h3>

            {activities && activities.length > 0 ? (
                <div className="space-y-3">
                    {activities.map((activity) => {
                        const Icon = activityIcons[activity.tipo as keyof typeof activityIcons] || activityIcons.default
                        const colorClass = activityColors[activity.tipo as keyof typeof activityColors] || activityColors.default
                        const userName = activity.created_by_profile?.nome || 'Sistema'

                        return (
                            <div key={activity.id} className="flex gap-2 text-xs">
                                {/* Icon */}
                                <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                                    <Icon className="h-3 w-3" />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-900">{activity.descricao}</p>
                                    <p className="text-gray-500 mt-0.5">
                                        por {userName} • {formatDistanceToNow(new Date(activity.created_at!), { addSuffix: true, locale: ptBR })}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className="text-xs text-gray-500 italic">Nenhuma atividade registrada ainda</p>
            )}
        </div>
    )
}
