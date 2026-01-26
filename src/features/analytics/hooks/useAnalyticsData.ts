
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { AnalyticsData, AnalyticsLead, AnalyticsTrip, SimplifiedProfile } from '../types';

export function useAnalyticsData() {
    const [data, setData] = useState<AnalyticsData>({
        leads: [],
        trips: [],
        incidents: [],
        interactions: [],
        sdrs: [],
        planners: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // 1. Fetch Profiles
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('id, nome, avatar_url');

                if (profilesError) throw profilesError;

                // 2. Fetch Pipeline Stages
                const { data: stages, error: stagesError } = await supabase
                    .from('pipeline_stages')
                    .select('id, nome');

                if (stagesError) throw stagesError;

                const stageMap = new Map(stages?.map(s => [s.id, s.nome]));

                // 3. Fetch Cards
                const { data: cards, error: cardsError } = await supabase
                    .from('cards')
                    .select('*');

                if (cardsError) throw cardsError;

                // Transform Cards to Leads
                const leads: AnalyticsLead[] = (cards || []).map(card => {
                    const stageName = card.pipeline_stage_id ? stageMap.get(card.pipeline_stage_id) || 'Unknown' : 'Unknown';

                    let status: 'open' | 'won' | 'lost' = 'open';
                    if (card.status_comercial === 'ganho') status = 'won';
                    else if (card.status_comercial === 'perdido' || card.deleted_at) status = 'lost';

                    return {
                        id: card.id,
                        name: card.titulo,
                        origin: card.origem || 'Unknown',
                        status: status,
                        stage: stageName,
                        sdrId: card.sdr_owner_id || undefined,
                        plannerId: card.vendas_owner_id || card.dono_atual_id || undefined,
                        createdAt: new Date(card.created_at || Date.now()),
                        wonAt: card.taxa_data_status ? new Date(card.taxa_data_status) : undefined, // Rough approximation
                        value: card.valor_final || card.valor_estimado || 0,
                        product: card.produto
                    };
                });

                // Transform Cards to Trips (Simulated: any "Won" card is a trip)
                const trips: AnalyticsTrip[] = leads
                    .filter(l => l.status === 'won')
                    .map(l => {
                        const card = cards?.find(c => c.id === l.id);
                        return {
                            id: l.id,
                            leadId: l.id,
                            destination: l.name, // Using title as destination approximation
                            startDate: card?.data_viagem_inicio ? new Date(card.data_viagem_inicio) : undefined,
                            endDate: card?.data_viagem_fim ? new Date(card.data_viagem_fim) : undefined,
                            value: l.value,
                            margin: l.value * 0.1, // Mock 10% margin
                            status: 'confirmed'
                        };
                    });

                // Map Profiles
                const mappedProfiles: SimplifiedProfile[] = (profiles || []).map(p => ({
                    id: p.id,
                    name: p.nome || 'Unknown',
                    avatar: p.avatar_url || ''
                }));

                setData({
                    leads,
                    trips,
                    incidents: [],
                    interactions: [],
                    sdrs: mappedProfiles,
                    planners: mappedProfiles
                });

            } catch (err) {
                console.error("Error fetching analytics data:", err);
                setError(err as Error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return { data, loading, error };
}
