import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { GroupSummaryCard } from '../components/cards/group/GroupSummaryCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Search, Plus, Users, Filter, Plane } from 'lucide-react';
import type { Database } from '../database.types';

type Card = Database['public']['Tables']['cards']['Row'];

export default function GroupsPage() {
    const [searchTerm, setSearchTerm] = useState('');

    const { data: groups, isLoading } = useQuery({
        queryKey: ['groups-gallery'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('cards')
                .select('*')
                .eq('is_group_parent', true)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data as Card[];
        }
    });

    const filteredGroups = groups?.filter(group =>
        group.titulo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.origem?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <div className="h-full flex flex-col bg-gray-50/50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary-100/30 via-primary-50/10 to-transparent pointer-events-none" />
            <div className="absolute -top-[20%] -right-[10%] w-[800px] h-[800px] bg-primary-200/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex-none p-8 pb-6 relative z-10">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-4 tracking-tight">
                            <div className="p-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl shadow-sm">
                                <Plane className="h-8 w-8 text-primary-600" />
                            </div>
                            Galeria de Grupos
                        </h1>
                        <p className="text-gray-500 mt-3 ml-[4.5rem] max-w-2xl text-lg font-medium">
                            Gerencie suas excursões e grupos de viagem com uma visão panorâmica e inteligente.
                        </p>
                    </div>
                    <Button className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/20 h-12 px-8 text-base font-medium rounded-xl transition-all hover:scale-105 active:scale-95">
                        <Plus className="h-5 w-5 mr-2" />
                        Novo Grupo
                    </Button>
                </div>

                {/* Filters Bar */}
                <div className="flex items-center gap-4 bg-white/60 backdrop-blur-xl p-2 rounded-2xl border border-white/40 shadow-sm max-w-4xl">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input
                            placeholder="Buscar por nome, origem ou destino..."
                            className="pl-12 bg-white/50 border-transparent focus:border-primary/30 focus:bg-white transition-all h-12 text-base rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="h-8 w-px bg-gray-200/50" />
                    <Button variant="ghost" className="text-gray-600 hover:bg-white/50 hover:text-primary h-12 px-6 rounded-xl font-medium">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros Avançados
                    </Button>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-8 pt-2 relative z-10 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="h-80 bg-white/40 rounded-3xl animate-pulse border border-white/20" />
                        ))}
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                        <div className="p-8 bg-white/50 backdrop-blur-md rounded-full mb-6 shadow-sm border border-white/20">
                            <Users className="h-16 w-16 text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Nenhum grupo encontrado</h3>
                        <p className="text-gray-500 max-w-md text-lg">
                            Não encontramos nenhum grupo com os termos pesquisados. Tente ajustar sua busca ou crie um novo grupo.
                        </p>
                        <Button variant="outline" className="mt-8 h-12 px-8 text-base rounded-xl border-gray-200 hover:bg-white/50" onClick={() => setSearchTerm('')}>
                            Limpar Filtros
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-20">
                        {filteredGroups.map((group) => (
                            <GroupSummaryCard key={group.id} group={group} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
