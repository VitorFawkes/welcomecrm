

import { AnalyticsProvider, useAnalytics } from '../features/analytics/context/AnalyticsContext';
import { Overview } from '../features/analytics/pages/Overview';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

function AnalyticsContent() {
    const { setDateRange, granularity, setGranularity } = useAnalytics();

    return (
        <div className="h-full overflow-y-auto bg-slate-50/50 p-8 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics</h1>
                    <p className="text-sm text-slate-500">Visão geral de performance e funil de vendas.</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <select
                        className="text-sm border-none bg-transparent focus:ring-0 text-slate-600 font-medium cursor-pointer"
                        value={granularity}
                        onChange={(e) => setGranularity(e.target.value as any)}
                    >
                        <option value="day">Diário</option>
                        <option value="week">Semanal</option>
                        <option value="month">Mensal</option>
                    </select>

                    <div className="h-4 w-px bg-slate-200" />

                    <select
                        className="text-sm border-none bg-transparent focus:ring-0 text-slate-600 font-medium cursor-pointer"
                        onChange={(e) => {
                            const val = e.target.value;
                            const today = new Date();
                            if (val === 'this_month') {
                                setDateRange({ start: startOfMonth(today), end: today });
                            } else if (val === 'last_month') {
                                const last = subMonths(today, 1);
                                setDateRange({ start: startOfMonth(last), end: endOfMonth(last) });
                            } else if (val === 'last_3_months') {
                                setDateRange({ start: startOfMonth(subMonths(today, 2)), end: today });
                            } else if (val === 'this_year') {
                                setDateRange({ start: new Date(today.getFullYear(), 0, 1), end: today });
                            }
                        }}
                    >
                        <option value="this_month">Este Mês</option>
                        <option value="last_month">Mês Passado</option>
                        <option value="last_3_months">Últimos 3 Meses</option>
                        <option value="this_year">Este Ano</option>
                    </select>
                </div>
            </div>

            <Overview />
        </div>
    );
}

export default function AnalyticsPage() {
    return (
        <AnalyticsProvider>
            <AnalyticsContent />
        </AnalyticsProvider>
    );
}
