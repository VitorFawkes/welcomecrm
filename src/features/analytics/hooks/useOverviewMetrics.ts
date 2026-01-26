
import { useMemo } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import { isWithinInterval, differenceInDays } from 'date-fns';

export function useOverviewMetrics() {
    const { filteredData: data, dateRange, mode } = useAnalytics();

    const metrics = useMemo(() => {
        const { leads, trips } = data;

        // Filter leads based on Date Range and Mode
        const filteredLeads = leads.filter(lead => {
            const dateToCheck = mode === 'cohort' ? lead.createdAt : (lead.contactedAt || lead.createdAt);
            return isWithinInterval(dateToCheck, { start: dateRange.start, end: dateRange.end });
        });

        // Filter trips based on Date Range
        const filteredTrips = trips.filter(trip => {
            const lead = leads.find(l => l.id === trip.leadId);
            if (!lead) return false; // Or use trip date

            // If lead wonAt is missing, use trip startDate as fallback or skip?
            const dateToCheck = mode === 'cohort' ? lead.createdAt : (lead.wonAt || trip.startDate || new Date(0));
            return isWithinInterval(dateToCheck, { start: dateRange.start, end: dateRange.end });
        });

        const totalLeads = filteredLeads.length;
        const contactedLeads = filteredLeads.filter(l => l.contactedAt).length; // Will be 0 if not populated
        const wonLeads = filteredLeads.filter(l => l.status === 'won').length;

        const contactRate = totalLeads ? (contactedLeads / totalLeads) * 100 : 0;
        const conversionRate = totalLeads ? (wonLeads / totalLeads) * 100 : 0;

        const totalRevenue = filteredTrips.reduce((acc, trip) => acc + trip.value, 0);
        const totalSales = filteredTrips.length;
        const ticketAverage = totalSales ? totalRevenue / totalSales : 0;

        // Cycle time (Created -> Won)
        const cycleTimes = filteredLeads
            .filter(l => l.status === 'won' && l.wonAt)
            .map(l => differenceInDays(l.wonAt!, l.createdAt));
        const avgCycleTime = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;

        // NPS (Mocked for now as we don't have real NPS data yet)
        const nps = 85;

        // Funnel Counts
        const stages = [
            'Novo Lead', 'Tentativa de Contato', 'Conectado', 'Apresentação Feita',
            'Taxa Paga / Cliente Elegível', 'Aguardando Briefing', 'Briefing Agendado',
            'Briefing Realizado', 'Proposta em Construção', 'Proposta Enviada',
            'Ajustes & Refinamentos', 'Viagem Aprovada', 'Reservas em Andamento',
            'Pagamento & Documentação', 'Viagem Confirmada (Ganho)', 'App & Conteúdo em Montagem',
            'Pré-embarque', 'Em Viagem', 'Viagem Concluída', 'Pós-viagem & Reativação',
            'Fechado - Perdido'
        ];

        const getStageIndex = (stage: string) => stages.indexOf(stage);

        const countLeadsReached = (targetStage: string) => {
            const targetIndex = getStageIndex(targetStage);
            if (targetIndex === -1) return 0; // Stage mismatch handling

            return filteredLeads.filter(l => {
                const leadIndex = getStageIndex(l.stage);
                // If lead stage unknown, assume 0
                if (leadIndex === -1) return false;

                return leadIndex >= targetIndex;
            }).length;
        };

        const taxaPagaCount = countLeadsReached('Taxa Paga / Cliente Elegível');
        const briefingRealizadoCount = countLeadsReached('Briefing Realizado');
        const propostaEnviadaCount = countLeadsReached('Proposta Enviada');
        const viagemConfirmadaCount = countLeadsReached('Viagem Confirmada (Ganho)');

        // Financials for "Viagem Confirmada"
        const confirmedTrips = filteredTrips.filter(t => {
            const lead = leads.find(l => l.id === t.leadId);
            if (!lead) return false;
            const leadIndex = getStageIndex(lead.stage);
            const targetIndex = getStageIndex('Viagem Confirmada (Ganho)');
            return leadIndex >= targetIndex;
        });

        const confirmedTripsCount = confirmedTrips.length;
        const confirmedTripsValue = confirmedTrips.reduce((acc, t) => acc + t.value, 0);
        const confirmedTripsMargin = confirmedTrips.reduce((acc, t) => acc + t.margin, 0);
        const confirmedTicketAverage = confirmedTripsCount ? confirmedTripsValue / confirmedTripsCount : 0;

        // Rates
        const taxaPagaRate = totalLeads ? (taxaPagaCount / totalLeads) * 100 : 0;
        const briefingRealizadoRate = totalLeads ? (briefingRealizadoCount / totalLeads) * 100 : 0;
        const propostaEnviadaRate = totalLeads ? (propostaEnviadaCount / totalLeads) * 100 : 0;
        const viagemConfirmadaRate = totalLeads ? (viagemConfirmadaCount / totalLeads) * 100 : 0;

        return {
            totalLeads,
            contactRate,
            conversionRate,
            totalSales,
            totalRevenue,
            ticketAverage,
            avgCycleTime,
            nps,
            taxaPagaRate,
            briefingRealizadoRate,
            propostaEnviadaRate,
            viagemConfirmadaRate,
            confirmedTripsCount,
            confirmedTripsValue,
            confirmedTripsMargin,
            confirmedTicketAverage
        };
    }, [data, dateRange, mode]);

    return metrics;
}
