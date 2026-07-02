import { memo } from 'react'
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { formatPercent } from '@/utils/format'
import { getVizColors, tooltipStyle } from './chartTheme'

export interface RadarDatum {
  metric: string
  value: number | null
  /** Optional comparison series (e.g. team or company average). */
  reference?: number | null
}

interface KpiRadarChartProps {
  data: RadarDatum[]
  seriesName: string
  referenceName?: string
}

/**
 * Radar of percent KPIs. The radius domain adapts to the data so values
 * above 100 % stay inside the chart.
 */
export const KpiRadarChart = memo(function KpiRadarChart({
  data,
  seriesName,
  referenceName,
}: KpiRadarChartProps) {
  const { theme } = useTheme()
  const colors = getVizColors(theme)

  const points = data.filter((d) => d.value !== null)
  if (points.length < 3) {
    return (
      <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
        Nedostatek dat pro radar
      </div>
    )
  }

  const allValues = points.flatMap((d) =>
    d.reference !== null && d.reference !== undefined
      ? [d.value!, d.reference]
      : [d.value!],
  )
  const max = Math.max(Math.ceil((Math.max(...allValues) + 5) / 10) * 10, 100)
  const hasReference = points.some(
    (d) => d.reference !== null && d.reference !== undefined,
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={points} outerRadius="72%">
        <PolarGrid stroke={colors.grid} />
        <PolarAngleAxis
          dataKey="metric"
          tick={{ fill: colors.muted, fontSize: 11 }}
        />
        <PolarRadiusAxis
          domain={[0, max]}
          tick={{ fill: colors.muted, fontSize: 10 }}
          axisLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle(colors)}
          formatter={(value: number, name: string) => [
            formatPercent(value),
            name,
          ]}
        />
        {hasReference && referenceName && (
          <Radar
            name={referenceName}
            dataKey="reference"
            stroke={colors.muted}
            fill={colors.muted}
            fillOpacity={0.12}
            strokeWidth={2}
          />
        )}
        <Radar
          name={seriesName}
          dataKey="value"
          stroke={colors.series[0]}
          fill={colors.series[0]}
          fillOpacity={0.25}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
})
