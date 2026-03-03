import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Briefcase,
    DollarSign,
    Clock,
    AlertTriangle,
    ReceiptText,
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    Cell, LabelList,
} from 'recharts'
import KpiCard from '../KpiCard'
import ChartCard from '../ChartCard'
import PhaseSummaryCard from '../PhaseSummaryCard'
import { QueryErrorState } from '@/components/ui/QueryErrorState'
import { usePipelineCurrent, type PipelineCurrentAging } from '@/hooks/analytics/usePipelineCurrent'
import { useDrillDownStore } from '@/hooks/analytics/useAnalyticsDrillDown'
import { useAnalyticsFilters } from '@/hooks/analytics/useAnalyticsFilters'
import { formatCurrency } from '@/utils/whatsappFormatters'
import { cn } from '@/lib/utils'

// ── Constants ──

type PhaseFilter = 'all' | 'sdr' | 'planner' | 'pos-venda'
type MetricMode = 'cards' | 'valor'

const PHASE_COLORS: Record<string, string> = {
    sdr: '#3b82f6',
    planner: '#8b5cf6',
    'pos-venda': '#10b981',
}

const PHASE_LABELS: Record<string, string> = {
    sdr: 'SDR (Pré-Venda)',
    planner: 'Planner (Venda)',
    'pos-venda': 'Pós-Venda',
}

const PHASE_FILTER_OPTIONS: { value: PhaseFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'sdr', label: 'SDR' },
    { value: 'planner', label: 'Planner' },
    { value: 'pos-venda', label: 'Pós-Venda' },
]

function getPhaseColor(slug: string): string {
    return PHASE_COLORS[slug] || '#94a3b8'
}

function matchesPhase(slug: string | undefined | null, filter: PhaseFilter): boolean {
    if (filter === 'all') return true
    if (filter === 'pos-venda') return !!slug && !['sdr', 'planner', 'resolucao'].includes(slug)
    return slug === filter
}

const LABEL_MAX = 18
function truncateLabel(label: string): string {
    return label.length > LABEL_MAX ? label.slice(0, LABEL_MAX - 1) + '…' : label
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RotatedXTick(props: any) {
    const { x, y, payload } = props
    if (!payload?.value) return null
    const full: string = payload.value
    const label = truncateLabel(full)
    return (
        <g transform={`translate(${x},${y})`}>
            <title>{full}</title>
            <text x={0} y={0} dy={8} textAnchor="end" fill="#475569" fontSize={10} transform="rotate(-45)">
                {label}
            </text>
        </g>
    )
}

function agingCellColor(count: number): string {
    if (count === 0) return 'bg-slate-50 text-slate-300'
    if (count <= 2) return 'bg-green-50 text-green-700'
    if (count <= 5) return 'bg-amber-50 text-amber-700'
    return 'bg-rose-50 text-rose-700'
}

function getDealRisk(deal: { is_sla_breach: boolean; days_in_stage: number }): 'critical' | 'warning' | 'normal' {
    if (deal.is_sla_breach || deal.days_in_stage > 14) return 'critical'
    if (deal.days_in_stage > 7) return 'warning'
    return 'normal'
}

const RISK_STYLES = {
    critical: 'border-l-2 border-l-rose-500 bg-rose-50/50',
    warning: 'border-l-2 border-l-amber-400 bg-amber-50/30',
    normal: '',
}

// ── Component ──

export default function PipelineCurrentView() {
    const navigate = useNavigate()
    const drillDown = useDrillDownStore()
    const { setActiveView, setDatePreset } = useAnalyticsFilters()

    const { data, isLoading, error, refetch } = usePipelineCurrent()

    const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
    const [stageMetric, setStageMetric] = useState<MetricMode>('cards')
    const [ownerMetric, setOwnerMetric] = useState<MetricMode>('cards')

    // Hide date pickers for this snapshot view
    useEffect(() => {
        const prevPreset = useAnalyticsFilters.getState().datePreset
        setActiveView('pipeline')
        setDatePreset('all_time')
        return () => {
            setActiveView('overview')
            setDatePreset(prevPreset)
        }
    }, [setActiveView, setDatePreset])

    const allStages = data?.stages || []
    const allAging = data?.aging || []
    const allOwners = data?.owners || []
    const allDeals = data?.top_deals || []
    const globalKpis = data?.kpis || {
        total_open: 0, total_value: 0, avg_ticket: 0,
        avg_age_days: 0, sla_breach_count: 0, sla_breach_pct: 0,
    }

    // ── Phase summaries (always from ALL data) ──
    const phaseSummaries = useMemo(() => {
        const slugs: PhaseFilter[] = ['sdr', 'planner', 'pos-venda']
        return slugs.map(slug => {
            const filtered = allStages.filter(s => matchesPhase(s.fase_slug, slug))
            const count = filtered.reduce((sum, s) => sum + s.card_count, 0)
            const value = filtered.reduce((sum, s) => sum + s.valor_total, 0)
            const avgDays = count > 0
                ? +(filtered.reduce((sum, s) => sum + s.avg_days * s.card_count, 0) / count).toFixed(1)
                : 0
            return { slug, label: PHASE_LABELS[slug], color: PHASE_COLORS[slug], count, value, avgDays }
        })
    }, [allStages])

    // ── Unassigned count ──
    const unassignedCount = useMemo(() =>
        allOwners.find(o => o.owner_id === null)?.total_cards ?? 0
    , [allOwners])

    // ── Filtered data (by phaseFilter) ──
    const stages = useMemo(() =>
        allStages.filter(s => matchesPhase(s.fase_slug, phaseFilter))
    , [allStages, phaseFilter])

    const aging = useMemo(() =>
        allAging.filter(a => matchesPhase(a.fase_slug, phaseFilter))
    , [allAging, phaseFilter])

    const topDeals = useMemo(() =>
        phaseFilter === 'all' ? allDeals : allDeals.filter(d => matchesPhase(d.fase_slug, phaseFilter))
    , [allDeals, phaseFilter])

    // ── Derived KPIs (recalc when phase filter active) ──
    const kpis = useMemo(() => {
        if (phaseFilter === 'all') return globalKpis
        const count = stages.reduce((sum, s) => sum + s.card_count, 0)
        const value = stages.reduce((sum, s) => sum + s.valor_total, 0)
        const slaBreach = stages.reduce((sum, s) => sum + s.sla_breach_count, 0)
        return {
            total_open: count,
            total_value: value,
            avg_ticket: count > 0 ? Math.round(value / count) : 0,
            avg_age_days: count > 0
                ? +(stages.reduce((sum, s) => sum + s.avg_days * s.card_count, 0) / count).toFixed(1)
                : 0,
            sla_breach_count: slaBreach,
            sla_breach_pct: 0,
        }
    }, [phaseFilter, stages, globalKpis])

    // ── Display name disambiguation ──
    const stageDisplayNames = useMemo(() => {
        const nameCount = new Map<string, number>()
        for (const s of stages) nameCount.set(s.stage_nome, (nameCount.get(s.stage_nome) || 0) + 1)
        const map = new Map<string, string>()
        for (const s of stages) {
            const isDupe = (nameCount.get(s.stage_nome) || 0) > 1
            const suffix = isDupe && s.produto === 'WEDDING' ? ' (W)' : isDupe && s.produto ? ` (${s.produto[0]})` : ''
            map.set(s.stage_id, s.stage_nome + suffix)
        }
        return map
    }, [stages])

    const chartStages = useMemo(() =>
        stages.map(s => ({ ...s, display_nome: stageDisplayNames.get(s.stage_id) || s.stage_nome }))
    , [stages, stageDisplayNames])

    // ── Owner chart data ──
    const ownerChartData = useMemo(() => {
        let filtered = allOwners
        if (phaseFilter !== 'all') {
            filtered = allOwners
                .map(o => {
                    const phKey = phaseFilter as keyof typeof o.by_phase
                    const cards = o.by_phase[phKey] || 0
                    const value = o.by_phase_value[phKey] || 0
                    return { ...o, total_cards: cards, total_value: value }
                })
                .filter(o => o.total_cards > 0)
                .sort((a, b) => b.total_cards - a.total_cards)
        }
        return filtered.slice(0, 12).map(o => {
            if (phaseFilter !== 'all') {
                const phKey = phaseFilter as keyof typeof o.by_phase
                return {
                    name: o.owner_nome,
                    owner_id: o.owner_id,
                    [phaseFilter]: ownerMetric === 'cards' ? (o.by_phase[phKey] || 0) : (o.by_phase_value[phKey] || 0),
                    total: ownerMetric === 'cards' ? o.total_cards : o.total_value,
                }
            }
            return {
                name: o.owner_nome,
                owner_id: o.owner_id,
                sdr: ownerMetric === 'cards' ? o.by_phase.sdr : o.by_phase_value.sdr,
                planner: ownerMetric === 'cards' ? o.by_phase.planner : o.by_phase_value.planner,
                'pos-venda': ownerMetric === 'cards' ? o.by_phase['pos-venda'] : o.by_phase_value['pos-venda'],
                total: ownerMetric === 'cards' ? o.total_cards : o.total_value,
            }
        })
    }, [allOwners, phaseFilter, ownerMetric])

    const ownerBarKeys = useMemo(() => {
        if (phaseFilter !== 'all') return [phaseFilter]
        return Object.keys(PHASE_COLORS)
    }, [phaseFilter])

    // ── Phase indicator counts for chart ──
    const phaseCounts = useMemo(() => ({
        sdr: stages.filter(s => s.fase_slug === 'sdr').length,
        planner: stages.filter(s => s.fase_slug === 'planner').length,
        pos: stages.filter(s => matchesPhase(s.fase_slug, 'pos-venda')).length,
    }), [stages])

    // ── Aging totals row ──
    const agingTotals = useMemo(() => ({
        bucket_0_3: aging.reduce((s, a) => s + a.bucket_0_3, 0),
        bucket_3_7: aging.reduce((s, a) => s + a.bucket_3_7, 0),
        bucket_7_14: aging.reduce((s, a) => s + a.bucket_7_14, 0),
        bucket_14_plus: aging.reduce((s, a) => s + a.bucket_14_plus, 0),
    }), [aging])

    // ── Drill-down handlers ──
    const handleStageDrill = (stageId: string, stageName: string) => {
        drillDown.open({ label: stageName, drillStageId: stageId, drillSource: 'current_stage', excludeTerminal: true })
    }
    const handleOwnerDrill = (ownerId: string | null, ownerName: string) => {
        if (!ownerId) return
        drillDown.open({ label: `${ownerName} — Pipeline`, drillOwnerId: ownerId, drillSource: 'current_stage', excludeTerminal: true })
    }
    const handleAllCardsDrill = () => {
        drillDown.open({ label: 'Pipeline Aberto', drillSource: 'current_stage', excludeTerminal: true })
    }

    // ── Metric toggle button ──
    const MetricToggle = ({ value, onChange }: { value: MetricMode; onChange: (v: MetricMode) => void }) => (
        <div className="flex bg-slate-100 rounded-lg p-0.5">
            {([['cards', 'Qtd'], ['valor', 'R$']] as const).map(([v, label]) => (
                <button
                    key={v}
                    onClick={() => onChange(v)}
                    className={cn(
                        'px-2.5 py-1 text-[10px] font-semibold rounded-md transition-colors',
                        value === v ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    )

    const stageDataKey = stageMetric === 'cards' ? 'card_count' : 'valor_total'

    return (
        <div className="space-y-5">
            {error && <QueryErrorState compact title="Erro ao carregar snapshot do pipeline" onRetry={refetch} />}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard
                    title="Cards Abertos"
                    value={kpis.total_open}
                    icon={Briefcase}
                    color="text-blue-600"
                    bgColor="bg-blue-50"
                    isLoading={isLoading}
                    onClick={handleAllCardsDrill}
                    clickHint="Ver todos os cards"
                    subtitle={unassignedCount > 0 ? `${unassignedCount} sem responsável` : undefined}
                />
                <KpiCard
                    title="Valor no Pipeline"
                    value={formatCurrency(kpis.total_value)}
                    icon={DollarSign}
                    color="text-emerald-600"
                    bgColor="bg-emerald-50"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Ticket Médio"
                    value={formatCurrency(kpis.avg_ticket)}
                    icon={ReceiptText}
                    color="text-indigo-600"
                    bgColor="bg-indigo-50"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="Idade Média (dias)"
                    value={kpis.avg_age_days}
                    icon={Clock}
                    color="text-amber-600"
                    bgColor="bg-amber-50"
                    isLoading={isLoading}
                />
                <KpiCard
                    title="SLA Violado"
                    value={kpis.sla_breach_count > 0 ? `${kpis.sla_breach_count}` : '0'}
                    icon={AlertTriangle}
                    color={kpis.sla_breach_count > 0 ? 'text-rose-600' : 'text-slate-400'}
                    bgColor={kpis.sla_breach_count > 0 ? 'bg-rose-50' : 'bg-slate-50'}
                    isLoading={isLoading}
                />
            </div>

            {/* ── Phase Summary Cards ── */}
            <div className="grid grid-cols-3 gap-4">
                {phaseSummaries.map(ps => (
                    <PhaseSummaryCard
                        key={ps.slug}
                        label={ps.label}
                        color={ps.color}
                        cardCount={ps.count}
                        totalValue={ps.value}
                        avgDays={ps.avgDays}
                        isActive={phaseFilter === ps.slug}
                        onClick={() => setPhaseFilter(phaseFilter === ps.slug ? 'all' : ps.slug as PhaseFilter)}
                    />
                ))}
            </div>

            {/* ── Phase Filter Toggle ── */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 w-fit">
                {PHASE_FILTER_OPTIONS.map(opt => (
                    <button
                        key={opt.value}
                        onClick={() => setPhaseFilter(opt.value)}
                        className={cn(
                            'px-3 py-1.5 text-xs font-semibold rounded-md transition-colors',
                            phaseFilter === opt.value
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        )}
                    >
                        {opt.value !== 'all' && (
                            <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: PHASE_COLORS[opt.value] }} />
                        )}
                        {opt.label}
                    </button>
                ))}
            </div>

            {/* ── Distribuição por Etapa ── */}
            <ChartCard
                title="Distribuição por Etapa"
                description={phaseFilter === 'all' ? 'Cards abertos por etapa' : `Etapas de ${PHASE_LABELS[phaseFilter]}`}
                colSpan={2}
                isLoading={isLoading}
                actions={<MetricToggle value={stageMetric} onChange={setStageMetric} />}
            >
                <div style={{ width: '100%', height: Math.max(280, chartStages.length * 8 + 100) }}>
                    <ResponsiveContainer>
                        <BarChart data={chartStages} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                            <XAxis dataKey="display_nome" tick={RotatedXTick} interval={0} height={70} />
                            <YAxis
                                tick={{ fontSize: 11, fill: '#64748b' }}
                                width={stageMetric === 'valor' ? 70 : 40}
                                tickFormatter={stageMetric === 'valor' ? (v: number) => `${(v / 1000).toFixed(0)}k` : undefined}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    if (name === 'valor_total') return [formatCurrency(value), 'Valor']
                                    return [value, 'Cards']
                                }}
                                labelFormatter={(label) => {
                                    const stage = chartStages.find(s => s.display_nome === label)
                                    if (!stage) return label
                                    return `${label} (${stage.fase}) — ${stage.card_count} cards — ${formatCurrency(stage.valor_total)}`
                                }}
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                            />
                            <Bar dataKey={stageDataKey} radius={[4, 4, 0, 0]} cursor="pointer"
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                onClick={(_data: any, idx: number) => {
                                    const s = chartStages[idx]
                                    if (s) handleStageDrill(s.stage_id, s.display_nome)
                                }}
                            >
                                {chartStages.map((s, i) => (
                                    <Cell key={i} fill={getPhaseColor(s.fase_slug)} />
                                ))}
                                <LabelList
                                    dataKey={stageDataKey}
                                    position="top"
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    formatter={(v: any) => stageMetric === 'valor' ? `${(Number(v) / 1000).toFixed(0)}k` : v}
                                    style={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {phaseFilter === 'all' && (
                    <div className="flex items-center gap-0 mx-6 mt-1 mb-2">
                        {phaseCounts.sdr > 0 && (
                            <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PHASE_COLORS.sdr }} />
                                <span className="text-[10px] font-medium text-slate-500">SDR</span>
                            </div>
                        )}
                        {phaseCounts.planner > 0 && (
                            <div className="flex items-center gap-1.5 px-3 border-r border-slate-200">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PHASE_COLORS.planner }} />
                                <span className="text-[10px] font-medium text-slate-500">Planner</span>
                            </div>
                        )}
                        {phaseCounts.pos > 0 && (
                            <div className="flex items-center gap-1.5 pl-3">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PHASE_COLORS['pos-venda'] }} />
                                <span className="text-[10px] font-medium text-slate-500">Pós-venda</span>
                            </div>
                        )}
                    </div>
                )}
            </ChartCard>

            {/* ── Row: Aging + Owner Workload ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Aging Heatmap */}
                <ChartCard title="Tempo na Etapa (Aging)" description="Cards por faixa de dias em cada etapa" isLoading={isLoading}>
                    <div className="px-4 pb-2 overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="text-left py-2 pr-3 text-slate-500 font-medium">Etapa</th>
                                    <th className="text-center px-2 py-2 text-slate-500 font-medium">0-3d</th>
                                    <th className="text-center px-2 py-2 text-slate-500 font-medium">3-7d</th>
                                    <th className="text-center px-2 py-2 text-slate-500 font-medium">7-14d</th>
                                    <th className="text-center px-2 py-2 text-slate-500 font-medium">14d+</th>
                                    <th className="text-center px-2 py-2 text-slate-500 font-medium">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {aging.map((row: PipelineCurrentAging) => {
                                    const rowTotal = row.bucket_0_3 + row.bucket_3_7 + row.bucket_7_14 + row.bucket_14_plus
                                    return (
                                        <tr key={row.stage_id} className="border-b border-slate-50">
                                            <td className="py-1.5 pr-3 text-slate-700 font-medium truncate max-w-[160px]" title={stageDisplayNames.get(row.stage_id) || row.stage_nome}>
                                                {truncateLabel(stageDisplayNames.get(row.stage_id) || row.stage_nome)}
                                            </td>
                                            {(['bucket_0_3', 'bucket_3_7', 'bucket_7_14', 'bucket_14_plus'] as const).map((bucket) => {
                                                const pct = rowTotal > 0 ? Math.round(row[bucket] / rowTotal * 100) : 0
                                                return (
                                                    <td key={bucket} className="text-center px-1 py-1.5">
                                                        <button
                                                            className={cn(
                                                                'inline-flex items-center justify-center min-w-[2.5rem] h-6 px-1 rounded text-[10px] font-semibold transition-colors',
                                                                agingCellColor(row[bucket]),
                                                                row[bucket] > 0 && 'hover:ring-1 hover:ring-indigo-300 cursor-pointer'
                                                            )}
                                                            onClick={() => row[bucket] > 0 && handleStageDrill(row.stage_id, `${row.stage_nome} — ${bucket.replace('bucket_', '').replace('_plus', '+').replace('_', '-')}d`)}
                                                            disabled={row[bucket] === 0}
                                                        >
                                                            {row[bucket]}{rowTotal > 0 && row[bucket] > 0 && <span className="ml-0.5 text-[8px] opacity-70">({pct}%)</span>}
                                                        </button>
                                                    </td>
                                                )
                                            })}
                                            <td className="text-center px-2 py-1.5 text-slate-600 font-semibold tabular-nums">{rowTotal}</td>
                                        </tr>
                                    )
                                })}
                                {/* Totals row */}
                                {aging.length > 0 && (
                                    <tr className="border-t border-slate-200 bg-slate-50/50">
                                        <td className="py-1.5 pr-3 text-slate-500 font-semibold">Total</td>
                                        {(['bucket_0_3', 'bucket_3_7', 'bucket_7_14', 'bucket_14_plus'] as const).map(bucket => (
                                            <td key={bucket} className="text-center px-2 py-1.5 text-slate-600 font-semibold tabular-nums">
                                                {agingTotals[bucket]}
                                            </td>
                                        ))}
                                        <td className="text-center px-2 py-1.5 text-slate-800 font-bold tabular-nums">
                                            {agingTotals.bucket_0_3 + agingTotals.bucket_3_7 + agingTotals.bucket_7_14 + agingTotals.bucket_14_plus}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </ChartCard>

                {/* Owner Workload */}
                <ChartCard
                    title="Carga por Consultor"
                    description={phaseFilter === 'all' ? 'Cards por responsável, segmentados por fase' : `Cards de ${PHASE_LABELS[phaseFilter]} por responsável`}
                    isLoading={isLoading}
                    actions={<MetricToggle value={ownerMetric} onChange={setOwnerMetric} />}
                >
                    <div style={{ width: '100%', height: Math.max(280, ownerChartData.length * 36 + 40) }}>
                        <ResponsiveContainer>
                            <BarChart data={ownerChartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 11, fill: '#64748b' }}
                                    tickFormatter={ownerMetric === 'valor' ? (v: number) => `${(v / 1000).toFixed(0)}k` : undefined}
                                />
                                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} width={130} />
                                <Tooltip
                                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    formatter={(value: number, name: string) =>
                                        ownerMetric === 'valor' ? [formatCurrency(value), PHASE_LABELS[name] || name] : [value, PHASE_LABELS[name] || name]
                                    }
                                />
                                {ownerBarKeys.map(key => (
                                    <Bar
                                        key={key}
                                        dataKey={key}
                                        stackId="a"
                                        fill={getPhaseColor(key)}
                                        cursor="pointer"
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        onClick={(_data: any, idx: number) => {
                                            const o = ownerChartData[idx]
                                            if (o?.owner_id) handleOwnerDrill(o.owner_id as string, o.name)
                                        }}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>
            </div>

            {/* ── Deals em Risco ── */}
            <ChartCard
                title="Deals em Risco"
                description={`Top ${topDeals.length} cards com mais tempo na etapa atual`}
                colSpan={2}
                isLoading={isLoading}
            >
                <div className="px-4 pb-2 overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="text-left py-2.5 pr-3 text-slate-500 font-medium">Título</th>
                                <th className="text-left py-2.5 px-2 text-slate-500 font-medium">Contato</th>
                                <th className="text-left py-2.5 px-2 text-slate-500 font-medium">Fase / Etapa</th>
                                <th className="text-left py-2.5 px-2 text-slate-500 font-medium">Responsável</th>
                                <th className="text-right py-2.5 px-2 text-slate-500 font-medium">Valor</th>
                                <th className="text-right py-2.5 px-2 text-slate-500 font-medium">Dias</th>
                                <th className="text-center py-2.5 pl-2 text-slate-500 font-medium">SLA</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topDeals.map((deal) => {
                                const risk = getDealRisk(deal)
                                return (
                                    <tr
                                        key={deal.card_id}
                                        className={cn('border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors', RISK_STYLES[risk])}
                                        onClick={() => navigate(`/cards/${deal.card_id}`)}
                                    >
                                        <td className="py-2 pr-3 text-slate-800 font-medium truncate max-w-[200px]" title={deal.titulo}>
                                            {deal.titulo}
                                        </td>
                                        <td className="py-2 px-2 text-slate-500 truncate max-w-[120px]" title={deal.pessoa_nome || ''}>
                                            {deal.pessoa_nome || '—'}
                                        </td>
                                        <td className="py-2 px-2">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-white shrink-0"
                                                    style={{ background: getPhaseColor(deal.fase_slug) }}
                                                >
                                                    {deal.fase_slug === 'sdr' ? 'SDR' : deal.fase_slug === 'planner' ? 'PLAN' : 'PÓS'}
                                                </span>
                                                <span className="text-slate-600 truncate max-w-[100px]" title={deal.stage_nome}>{deal.stage_nome}</span>
                                            </div>
                                        </td>
                                        <td className="py-2 px-2 text-slate-600 truncate max-w-[120px]" title={deal.owner_nome}>
                                            {deal.owner_nome}
                                        </td>
                                        <td className="py-2 px-2 text-right text-slate-700 tabular-nums">
                                            {deal.valor_total > 0 ? formatCurrency(deal.valor_total) : '—'}
                                        </td>
                                        <td className="py-2 px-2 text-right tabular-nums font-semibold text-slate-800">
                                            {deal.days_in_stage}
                                        </td>
                                        <td className="py-2 pl-2 text-center">
                                            {deal.sla_hours ? (
                                                deal.is_sla_breach ? (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">Excedido</span>
                                                ) : (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">OK</span>
                                                )
                                            ) : (
                                                <span className="text-slate-300">—</span>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {topDeals.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400">
                                        Nenhum card em aberto{phaseFilter !== 'all' ? ` em ${PHASE_LABELS[phaseFilter]}` : ''}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </ChartCard>
        </div>
    )
}
