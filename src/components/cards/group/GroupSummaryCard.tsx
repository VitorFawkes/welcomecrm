
import { useNavigate } from 'react-router-dom';
import type { Database } from '../../../database.types';
import { Users, Calendar, MapPin, ArrowRight, Plane } from 'lucide-react';

type Card = Database['public']['Tables']['cards']['Row'];

interface GroupSummaryCardProps {
    group: Card;
}

export function GroupSummaryCard({ group }: GroupSummaryCardProps) {
    const navigate = useNavigate();

    // Status Mapping Logic
    const getStatusLabel = (status: string | null) => {
        if (!status) return null;
        const normalized = status.toLowerCase();
        if (normalized === 'em_andamento' || normalized === 'em_aberto') return 'Em Aberto';
        if (normalized === 'concluido' || normalized === 'encerrado') return 'Encerrado';
        if (normalized === 'cancelado') return 'Cancelado';
        return status.replace(/_/g, ' '); // Fallback for other statuses
    };

    const getStatusColor = (status: string | null) => {
        if (!status) return 'bg-gray-100 text-gray-600 border-gray-200';
        const normalized = status.toLowerCase();

        if (normalized === 'em_andamento' || normalized === 'em_aberto') {
            return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
        }
        if (normalized === 'concluido' || normalized === 'encerrado') {
            return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
        }
        if (normalized === 'cancelado') {
            return 'bg-red-500/10 text-red-600 border-red-500/20';
        }
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    const statusLabel = getStatusLabel(group.status_comercial);
    const statusColor = getStatusColor(group.status_comercial);

    return (
        <div
            onClick={() => navigate(`/cards/${group.id}`)}
            className="group relative flex flex-col bg-white/70 backdrop-blur-xl rounded-3xl border border-white/50 p-6 shadow-sm hover:shadow-2xl hover:bg-white/90 hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
        >
            {/* Decorative Gradient Blob */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-primary-400/20 to-purple-400/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-500" />

            <div className="flex items-start justify-between mb-5 relative z-10">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 group-hover:scale-110 transition-transform duration-300">
                    <Plane className="h-6 w-6 text-primary-600" />
                </div>
                {statusLabel && (
                    <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-full border ${statusColor}`}>
                        {statusLabel}
                    </span>
                )}
            </div>

            <div className="mb-4 relative z-10">
                <h3 className="font-bold text-gray-900 text-xl leading-tight mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
                    {group.titulo}
                </h3>
                {group.origem && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{group.origem}</span>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-5 border-t border-gray-100/50 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(group.created_at || '').toLocaleDateString()}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 text-primary-600 font-medium text-sm opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                    <span>Ver Detalhes</span>
                    <ArrowRight className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
}
