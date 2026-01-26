
import React from 'react';
import { useOverviewMetrics } from '../hooks/useOverviewMetrics';
import { useManagementMetrics } from '../hooks/useManagementMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Phone, CheckCircle, Plane, DollarSign, TrendingUp, Clock, FileText, Wallet, BarChart3, Loader2 } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, ComposedChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList, Cell } from 'recharts';
import { useAnalytics } from '../context/AnalyticsContext';
import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isSameDay, isSameWeek, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function Overview() {
    const metrics = useOverviewMetrics();
    const mgmtMetrics = useManagementMetrics();
    const { filteredData: data, dateRange, granularity, mode, loading } = useAnalytics();
    const [viewMode, setViewMode] = React.useState<'all' | 'sdr' | 'planner' | 'pos'>('all');

    // Prepare Stage Data (Operational Kanban)
    const { stageData, allOwners } = React.useMemo(() => {
        const stages = [
            'Novo Lead', 'Tentativa de Contato', 'Conectado', 'Apresentação Feita',
            'Taxa Paga / Cliente Elegível', 'Aguardando Briefing', 'Briefing Agendado',
            'Briefing Realizado', 'Proposta em Construção', 'Proposta Enviada',
            'Ajustes & Refinamentos', 'Viagem Aprovada', 'Reservas em Andamento',
            'Pagamento & Documentação', 'Viagem Confirmada (Ganho)', 'App & Conteúdo em Montagem',
            'Pré-embarque', 'Em Viagem', 'Viagem Concluída', 'Pós-viagem & Reativação',
            'Fechado - Perdido'
        ];
        const dataStructure = stages.map(stage => ({ stage }));
        const ownersSet = new Set<string>();

        data.leads.forEach(lead => {
            const currentStage = lead.stage;
            const stageObj = dataStructure.find(d => d.stage === currentStage);
            if (!stageObj) return;

            // Simplified owner logic based on what we have
            // We can improve this with role checks if we had them
            let ownerName = 'Não atribuído';

            // Check if we have an owner for this lead
            // Ideally we'd map stages to roles but for now just take the active owner
            if (lead.plannerId) {
                const p = data.planners.find(x => x.id === lead.plannerId);
                if (p) ownerName = p.name;
            } else if (lead.sdrId) {
                const s = data.sdrs.find(x => x.id === lead.sdrId);
                if (s) ownerName = s.name;
            }

            // @ts-ignore
            stageObj[ownerName] = (stageObj[ownerName] || 0) + 1;
            ownersSet.add(ownerName);
        });

        return { stageData: dataStructure, allOwners: Array.from(ownersSet).sort() };
    }, [data]);

    // Filtered Stage Data based on View Mode
    const filteredStageData = React.useMemo(() => {
        const sdrStages = [
            'Novo Lead', 'Tentativa de Contato', 'Conectado', 'Apresentação Feita',
            'Taxa Paga / Cliente Elegível'
        ];
        const plannerStages = [
            'Aguardando Briefing', 'Briefing Agendado', 'Briefing Realizado', 'Proposta em Construção',
            'Proposta Enviada', 'Ajustes & Refinamentos', 'Viagem Aprovada', 'Reservas em Andamento',
            'Pagamento & Documentação', 'Viagem Confirmada (Ganho)'
        ];
        const posStages = [
            'App & Conteúdo em Montagem', 'Pré-embarque', 'Em Viagem',
            'Viagem Concluída', 'Pós-viagem & Reativação', 'Fechado - Perdido'
        ];

        let dataToReturn = stageData;
        if (viewMode === 'sdr') dataToReturn = stageData.filter(d => sdrStages.includes(d.stage));
        else if (viewMode === 'planner') dataToReturn = stageData.filter(d => plannerStages.includes(d.stage));
        else if (viewMode === 'pos') dataToReturn = stageData.filter(d => posStages.includes(d.stage));

        // Calculate totals for the chart
        return dataToReturn.map(item => {
            const total = allOwners.reduce((acc, owner) => acc + ((item as any)[owner] || 0), 0);
            return { ...item, total };
        });
    }, [stageData, viewMode, allOwners]);

    const CustomXAxisTick = (props: any) => {
        const { x, y, payload } = props;
        // Safety check for payload
        if (!payload || !payload.value) return null;

        const words = payload.value.split(' ');
        const line1 = words.slice(0, Math.ceil(words.length / 2)).join(' ');
        const line2 = words.slice(Math.ceil(words.length / 2)).join(' ');

        return (
            <g transform={`translate(${x},${y})`}>
                <text x={0} y={0} dy={16} textAnchor="middle" fill="#64748b" fontSize={11}>
                    <tspan x={0} dy="0em">{line1}</tspan>
                    <tspan x={0} dy="1.2em">{line2}</tspan>
                </text>
            </g>
        );
    };

    const IndicatorBar = () => {
        if (viewMode !== 'all') return null;

        return (
            <div className="flex w-[2400px] -mt-4 px-[20px] text-xs font-bold text-center uppercase tracking-wider gap-1">
                <div className="flex-[5] border-t-4 border-blue-200 text-blue-500 pt-1">SDR</div>
                <div className="flex-[10] border-t-4 border-emerald-200 text-emerald-500 pt-1">Planner</div>
                <div className="flex-[6] border-t-4 border-purple-200 text-purple-500 pt-1">Pós-Venda</div>
            </div>
        );
    };

    const revenueData = React.useMemo(() => {
        if (!dateRange.start || !dateRange.end) return [];

        let intervals;
        try {
            if (granularity === 'day') {
                intervals = eachDayOfInterval(dateRange);
            } else if (granularity === 'week') {
                intervals = eachWeekOfInterval(dateRange);
            } else {
                intervals = eachMonthOfInterval(dateRange);
            }
        } catch (e) {
            console.error("Date interval error", e);
            return [];
        }

        return intervals.map(date => {
            const label = format(date, granularity === 'month' ? 'MMM yyyy' : 'dd/MM', { locale: ptBR });

            const salesInInterval = data.trips.filter(t => {
                const lead = data.leads.find(l => l.id === t.leadId);
                // logic: trip counts based on lead date or trip date
                if (!lead) return false;

                // If lead wonAt is missing, use trip startDate as fallback
                const d = mode === 'cohort' ? lead.createdAt : (lead.wonAt || t.startDate);
                if (!d) return false;

                if (granularity === 'day') return isSameDay(d, date);
                if (granularity === 'week') return isSameWeek(d, date);
                return isSameMonth(d, date);
            });

            const revenue = salesInInterval.reduce((acc, t) => acc + t.value, 0);

            return {
                date: label,
                revenue: revenue
            };
        });
    }, [data, dateRange, granularity, mode]);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-500">Carregando dados...</span>
            </div>
        );
    }

    const kpiCards = [
        { title: 'Leads Criados', value: metrics.totalLeads, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: '% Taxa Paga', value: `${metrics.taxaPagaRate.toFixed(1)}%`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: '% Briefing Realizado', value: `${metrics.briefingRealizadoRate.toFixed(1)}%`, icon: Phone, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { title: '% Proposta Enviada', value: `${metrics.propostaEnviadaRate.toFixed(1)}%`, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
        { title: '% Viagem Confirmada', value: `${metrics.viagemConfirmadaRate.toFixed(1)}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Tempo Médio (Lead -> Confirmada)', value: `${metrics.avgCycleTime.toFixed(1)} dias`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { title: 'Viagens Confirmadas', value: metrics.confirmedTripsCount, icon: Plane, color: 'text-sky-600', bg: 'bg-sky-50' },
        { title: 'Faturamento (Confirmadas)', value: `R$ ${metrics.confirmedTripsValue.toLocaleString('pt-BR')}`, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
        { title: 'Receita (Margem)', value: `R$ ${metrics.confirmedTripsMargin.toLocaleString('pt-BR')}`, icon: Wallet, color: 'text-rose-600', bg: 'bg-rose-50' },
        { title: 'Ticket Médio', value: `R$ ${metrics.confirmedTicketAverage.toLocaleString('pt-BR')}`, icon: BarChart3, color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {kpiCards.map((card, i) => (
                    <Card key={i} className="border-none shadow-sm hover:shadow-md transition-shadow duration-200">
                        <CardContent className="flex flex-col justify-between p-5 h-full">
                            <div className="flex justify-between items-start mb-2">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.title}</p>
                                <div className={`p-2 rounded-full ${card.bg}`}>
                                    <card.icon className={`h-4 w-4 ${card.color}`} />
                                </div>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="col-span-1 lg:col-span-2 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle>Funil de Vendas por Responsável (Kanban Operacional)</CardTitle>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            {(['all', 'sdr', 'planner', 'pos'] as const).map((mode) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${viewMode === mode
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    {mode === 'all' ? 'Todos' : mode === 'pos' ? 'Pós-Venda' : mode.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent>

                        {/* Scroll Container Wrapper */}
                        <div className="relative group">
                            <div
                                ref={(ref) => {
                                    if (ref) {
                                        // Auto-scroll on wheel
                                        ref.onwheel = (e) => {
                                            if (e.deltaY !== 0) {
                                                e.preventDefault();
                                                ref.scrollLeft += e.deltaY;
                                            }
                                        };
                                    }
                                }}
                                className="w-full overflow-x-auto overflow-y-hidden pb-1 custom-scrollbar scroll-smooth"
                                id="kanban-scroll-container"
                            >
                                <div className={`${viewMode === 'all' ? 'min-w-[2000px]' : 'w-full'} h-[450px]`}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={filteredStageData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                            <XAxis
                                                dataKey="stage"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={<CustomXAxisTick />}
                                                interval={0}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 12 }}
                                            />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(0,0,0,0.05)' }}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                            {allOwners.map((owner) => {
                                                const colors = [
                                                    '#93c5fd', '#6ee7b7', '#fcd34d', '#fca5a5', '#c4b5fd',
                                                    '#f9a8d4', '#67e8f9', '#fdba74', '#a5b4fc', '#bef264'
                                                ];
                                                const colorIndex = allOwners.indexOf(owner);
                                                const color = colors[colorIndex % colors.length];

                                                return (
                                                    <Bar
                                                        key={owner}
                                                        dataKey={owner}
                                                        stackId="a"
                                                        fill={color}
                                                        radius={[0, 0, 0, 0]}
                                                        maxBarSize={60}
                                                    >
                                                        <LabelList
                                                            dataKey={owner}
                                                            position="inside"
                                                            fill="rgba(0,0,0,0.6)"
                                                            className="font-bold text-[10px]"
                                                            formatter={(val: any) => val > 0 ? val : ''}
                                                        />
                                                    </Bar>
                                                );
                                            })}
                                            <Line type="monotone" dataKey="total" stroke="none" dot={false} activeDot={false} legendType="none">
                                                <LabelList dataKey="total" position="top" offset={10} className="font-bold text-xs fill-slate-600" formatter={(val: any) => val > 0 ? val : ''} />
                                            </Line>
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <IndicatorBar />
                            </div>

                            {/* Left Scroll Gradient/Button */}
                            <div className="absolute top-0 bottom-0 left-0 w-12 bg-gradient-to-r from-white to-transparent opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity flex items-center justify-start pl-1">
                                <button
                                    onClick={() => document.getElementById('kanban-scroll-container')?.scrollBy({ left: -300, behavior: 'smooth' })}
                                    className="p-1 bg-white/80 rounded-full shadow-md border hover:bg-white pointer-events-auto"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-600"><path d="m15 18-6-6 6-6" /></svg>
                                </button>
                            </div>

                            {/* Right Scroll Gradient/Button */}
                            <div className="absolute top-0 bottom-0 right-0 w-12 bg-gradient-to-l from-white to-transparent opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity flex items-center justify-end pr-1">
                                <button
                                    onClick={() => document.getElementById('kanban-scroll-container')?.scrollBy({ left: 300, behavior: 'smooth' })}
                                    className="p-1 bg-white/80 rounded-full shadow-md border hover:bg-white pointer-events-auto"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate-600"><path d="m9 18 6-6-6-6" /></svg>
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1 lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Evolução da Receita</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR')}`} />
                                    <Legend />
                                    <Line type="monotone" dataKey="revenue" name="Receita" stroke="#d97706" strokeWidth={2} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Status Atual (Live) Section */}
            <div className="pt-4 border-t border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Status Atual (Live) & Capacidade</h3>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                    {/* 1. Funil Vivo (Snapshot) */}
                    <Card className="col-span-1 lg:col-span-2">
                        <CardHeader>
                            <CardTitle className="text-sm">Funil Vivo (Snapshot Atual)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={mgmtMetrics.macroFunnel} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="stage" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" name="Leads" radius={[4, 4, 0, 0]}>
                                            {mgmtMetrics.macroFunnel.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                            <LabelList dataKey="count" position="top" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Indicadores de Capacidade */}
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm">Capacidade Operacional (Estimada)</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-6">
                            <div>
                                <div className="flex justify-between mb-1">
                                    <span className="text-sm font-medium text-slate-700">Entrada (7 dias)</span>
                                    <span className="text-sm font-bold text-slate-900">{mgmtMetrics.capacityMetrics.inflow} leads</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.min(mgmtMetrics.capacityMetrics.utilization, 100)}%` }}></div>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {mgmtMetrics.capacityMetrics.utilization.toFixed(0)}% da capacidade semanal estimada ({mgmtMetrics.capacityMetrics.capacity})
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500">Backlog SDR</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {mgmtMetrics.sdrWorkload.reduce((acc, curr) => acc + curr.activeLeads, 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500">Backlog Planner</p>
                                    <p className="text-xl font-bold text-slate-800">
                                        {mgmtMetrics.plannerWorkload.reduce((acc, curr) => acc + curr.total, 0)}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </div>
    );
}
