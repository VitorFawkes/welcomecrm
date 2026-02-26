import { MousePointerClick } from 'lucide-react'
import type { VisualizationConfig, DrillDownFilters } from '@/lib/reports/reportTypes'
import BarChartRenderer from './BarChartRenderer'
import LineChartRenderer from './LineChartRenderer'
import AreaChartRenderer from './AreaChartRenderer'
import PieChartRenderer from './PieChartRenderer'
import TableRenderer from './TableRenderer'
import KpiRenderer from './KpiRenderer'
import FunnelRenderer from './FunnelRenderer'
import ComposedRenderer from './ComposedRenderer'

export interface ChartRendererProps {
    data: Record<string, unknown>[]
    visualization: VisualizationConfig
    dimensionKeys: string[]
    measureKeys: string[]
    labels?: Record<string, string>
    labelFormat?: 'number' | 'currency' | 'percent'
    keyFormats?: Record<string, 'number' | 'currency' | 'percent'>
    dateGrouping?: 'day' | 'week' | 'month' | 'quarter' | 'year'
    onDrillDown?: (filters: DrillDownFilters) => void
}

// Types that support drill-down click interaction
const DRILLABLE_TYPES = new Set(['bar_vertical', 'bar_horizontal', 'line', 'area', 'composed', 'pie', 'donut', 'funnel'])

export default function ChartRenderer(props: ChartRendererProps) {
    const { visualization, onDrillDown } = props
    const isDrillable = onDrillDown && DRILLABLE_TYPES.has(visualization.type)

    const chart = (() => {
        switch (visualization.type) {
            case 'bar_vertical':
                return <BarChartRenderer {...props} layout="vertical" />
            case 'bar_horizontal':
                return <BarChartRenderer {...props} layout="horizontal" />
            case 'line':
                return <LineChartRenderer {...props} />
            case 'area':
                return <AreaChartRenderer {...props} />
            case 'composed':
                return <ComposedRenderer {...props} />
            case 'pie':
                return <PieChartRenderer {...props} variant="pie" />
            case 'donut':
                return <PieChartRenderer {...props} variant="donut" />
            case 'table':
                return <TableRenderer {...props} />
            case 'kpi':
                return <KpiRenderer {...props} />
            case 'funnel':
                return <FunnelRenderer {...props} />
            default:
                return <TableRenderer {...props} />
        }
    })()

    return (
        <div className="h-full flex flex-col">
            <div className="flex-1 min-h-0">{chart}</div>
            {isDrillable && (
                <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1 justify-center">
                    <MousePointerClick className="w-3 h-3" />
                    Clique em um ponto para ver os registros
                </p>
            )}
        </div>
    )
}
