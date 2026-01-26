
import { useMemo } from 'react';
import { useAnalytics } from '../context/AnalyticsContext';
import { differenceInDays, isAfter, subDays, differenceInMinutes } from 'date-fns';

export function useManagementMetrics() {
    const { filteredData: data, dateRange, mode } = useAnalytics();

    const metrics = useMemo(() => {
        const { leads, trips, sdrs, planners, incidents } = data;

        // --- 1. PERFORMANCE RELATIVA (SCATTER PLOTS) ---
        const sdrScatter = sdrs.map(sdr => {
            const sdrLeads = leads.filter(l => l.sdrId === sdr.id);
            const won = sdrLeads.filter(l => l.status === 'won').length;
            const conversion = sdrLeads.length ? (won / sdrLeads.length) * 100 : 0;

            const contactTimes = sdrLeads
                .filter(l => l.contactedAt)
                .map(l => differenceInMinutes(l.contactedAt!, l.createdAt));
            const avgTime = contactTimes.length ? contactTimes.reduce((a, b) => a + b, 0) / contactTimes.length : 0;

            return {
                id: sdr.id,
                name: sdr.name,
                x: sdrLeads.length,
                y: conversion,
                z: avgTime,
            };
        });

        const plannerScatter = planners.map(planner => {
            const plannerLeads = leads.filter(l => l.plannerId === planner.id || l.briefingAt);
            const myLeads = plannerLeads.filter(l => l.plannerId === planner.id);

            const won = myLeads.filter(l => l.status === 'won').length;
            const conversion = myLeads.length ? (won / myLeads.length) * 100 : 0;

            const revenue = trips
                .filter(t => {
                    const l = leads.find(lead => lead.id === t.leadId);
                    return l?.plannerId === planner.id;
                })
                .reduce((acc, t) => acc + t.value, 0);

            return {
                id: planner.id,
                name: planner.name,
                x: myLeads.length,
                y: conversion,
                z: revenue,
            };
        });

        // --- 2. CARGA DE TRABALHO ---
        const sdrWorkload = sdrs.map(sdr => {
            const active = leads.filter(l => l.sdrId === sdr.id && l.status === 'open').length;
            return { name: sdr.name, activeLeads: active };
        }).sort((a, b) => b.activeLeads - a.activeLeads);

        const plannerWorkload = planners.map(planner => {
            const activeProposals = leads.filter(l =>
                l.plannerId === planner.id &&
                l.status === 'open' &&
                ['Proposta em Construção', 'Proposta Enviada', 'Ajustes & Refinamentos'].includes(l.stage)
            ).length;

            const activeTrips = trips.filter(t => {
                const l = leads.find(lead => lead.id === t.leadId);
                return l?.plannerId === planner.id && t.status === 'confirmed';
            }).length;

            return { name: planner.name, activeProposals, activeTrips, total: activeProposals + activeTrips };
        }).sort((a, b) => b.total - a.total);


        // --- 3. RISCO DE PERDA ---
        const riskLeads = leads.filter(l => {
            if (l.status !== 'open') return false;
            const daysInStage = differenceInDays(new Date(), l.createdAt);

            if (l.stage === 'Novo Lead' && daysInStage > 2) return true;
            if (l.stage === 'Proposta Enviada' && l.proposalAt && differenceInDays(new Date(), l.proposalAt) > 5) return true;
            if (l.stage === 'Briefing Agendado' && l.briefingAt && differenceInDays(new Date(), l.briefingAt) > 7) return true;

            return false;
        }).map(l => ({
            id: l.id,
            name: l.name,
            stage: l.stage,
            responsible: l.plannerId ? planners.find(p => p.id === l.plannerId)?.name : sdrs.find(s => s.id === l.sdrId)?.name,
            daysStalled: differenceInDays(new Date(), l.createdAt),
            reason: l.stage === 'Novo Lead' ? 'Sem contato inicial' : 'Estagnado na etapa'
        })).slice(0, 10);


        // --- 4. QUALIDADE x VELOCIDADE ---
        const plannerQuality = planners.map(planner => {
            const myLeads = leads.filter(l => l.plannerId === planner.id && l.status === 'won');

            const cycleTimes = myLeads.map(l => differenceInDays(l.wonAt!, l.briefingAt || l.createdAt));
            const avgSpeed = cycleTimes.length ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length : 0;

            const myTrips = trips.filter(t => {
                const l = leads.find(lead => lead.id === t.leadId);
                return l?.plannerId === planner.id;
            });

            const myIncidents = incidents.filter(i => myTrips.some(t => t.id === i.tripId));
            const incidentRate = myTrips.length ? (myIncidents.length / myTrips.length) * 100 : 0;

            return {
                id: planner.id,
                name: planner.name,
                x: avgSpeed,
                y: incidentRate,
                z: myTrips.length
            };
        });


        // --- 5. FUNIL VIVO ---
        const liveFunnel = leads.reduce((acc, curr) => {
            if (curr.status === 'open') {
                acc[curr.stage] = (acc[curr.stage] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const macroFunnel = [
            { stage: 'Novos', count: liveFunnel['Novo Lead'] || 0, fill: '#3b82f6' },
            { stage: 'Qualificação', count: (liveFunnel['Tentativa de Contato'] || 0) + (liveFunnel['Conectado'] || 0), fill: '#6366f1' },
            { stage: 'Briefing', count: (liveFunnel['Aguardando Briefing'] || 0) + (liveFunnel['Briefing Agendado'] || 0), fill: '#8b5cf6' },
            { stage: 'Proposta', count: (liveFunnel['Proposta em Construção'] || 0) + (liveFunnel['Proposta Enviada'] || 0), fill: '#ec4899' },
            { stage: 'Fechamento', count: (liveFunnel['Ajustes & Refinamentos'] || 0) + (liveFunnel['Viagem Aprovada'] || 0), fill: '#10b981' },
        ];


        // --- 6. EFICIÊNCIA DO HANDOFF ---
        const handoffEfficiency = sdrs.map(sdr => {
            const sdrLeads = leads.filter(l => l.sdrId === sdr.id);
            const won = sdrLeads.filter(l => l.status === 'won').length;

            const revenue = trips
                .filter(t => {
                    const l = leads.find(lead => lead.id === t.leadId);
                    return l?.sdrId === sdr.id;
                })
                .reduce((acc, t) => acc + t.value, 0);

            return {
                name: sdr.name,
                leadsSent: sdrLeads.length,
                dealsWon: won,
                conversion: sdrLeads.length ? (won / sdrLeads.length) * 100 : 0,
                revenueGenerated: revenue
            };
        }).sort((a, b) => b.revenueGenerated - a.revenueGenerated);


        // --- 7. EXPERIÊNCIA DO CLIENTE ---
        const incidentsByPhase = incidents.reduce((acc, inc) => {
            const trip = trips.find(t => t.id === inc.tripId);
            if (!trip) return acc;

            // Safe guard for dates
            if (!trip.startDate) return acc;

            if (inc.createdAt < trip.startDate) acc['Pré-Embarque']++;
            else if (trip.endDate && inc.createdAt > trip.endDate) acc['Pós-Viagem']++;
            else acc['Durante a Viagem']++;

            return acc;
        }, { 'Pré-Embarque': 0, 'Durante a Viagem': 0, 'Pós-Viagem': 0 } as Record<string, number>);

        const customerJourneyData = Object.entries(incidentsByPhase).map(([name, value]) => ({ name, value }));


        // --- 8. CAPACIDADE ---
        const sevenDaysAgo = subDays(new Date(), 7);
        const inflow = leads.filter(l => isAfter(l.createdAt, sevenDaysAgo)).length;
        const capacity = 50;
        const capacityUtilization = (inflow / capacity) * 100;

        return {
            sdrScatter,
            plannerScatter,
            sdrWorkload,
            plannerWorkload,
            riskLeads,
            plannerQuality,
            macroFunnel,
            handoffEfficiency,
            customerJourneyData,
            capacityMetrics: { inflow, capacity, utilization: capacityUtilization }
        };
    }, [data, dateRange, mode]);

    return metrics;
}
