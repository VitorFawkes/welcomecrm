import { useEffect, useState } from 'react';
import type { Database } from '@/database.types';
import { supabase } from '@/lib/supabase';
import { Users, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Card = Database['public']['Tables']['cards']['Row'];

interface ParentLinkBannerProps {
    parentId: string;
}

export function ParentLinkBanner({ parentId }: ParentLinkBannerProps) {
    const navigate = useNavigate();
    const [parent, setParent] = useState<Card | null>(null);

    useEffect(() => {
        const fetchParent = async () => {
            const { data } = await supabase
                .from('cards')
                .select('*')
                .eq('id', parentId)
                .single();

            if (data) setParent(data as Card);
        };
        fetchParent();
    }, [parentId]);

    if (!parent) return null;

    return (
        <div
            onClick={() => navigate(`/pipeline/cards/${parent.id}`)}
            className="bg-primary-500/10 border border-primary-500/20 rounded-lg p-3 mb-6 flex items-center justify-between cursor-pointer hover:bg-primary-500/20 transition-all group"
        >
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-500/20 rounded-full">
                    <Users className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                    <div className="text-xs text-primary-600 font-medium uppercase tracking-wider">
                        Parte do Grupo
                    </div>
                    <div className="text-gray-900 font-medium flex items-center gap-2">
                        {parent.titulo}
                    </div>
                </div>
            </div>
            <ArrowUpRight className="w-5 h-5 text-primary-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
    );
}
