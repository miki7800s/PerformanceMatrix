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
 * Radar values above this are visually clipped to the edge so a single
 * outlier metric (e.g. bad data) can't collapse every other axis to zero.
 * The tooltip still reports the real, unclipped value.
 */
const DOMAIN_CEILING = 200

/**
 * Radar of percent KPIs. The radius domain adapts to the data so values
 * above 100 % stay inside the chart, up to {@link DOMAIN_CEILING}.
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
  const clippedMax = Math.min(Math.max(...allValues), DOMAIN_CEILING)
  const max = Math.max(Math.ceil((clippedMax + 5) / 10) * 10, 100)
  const hasReference = points.some(
    (d) => d.reference !== null && d.reference !== undefined,
  )

  const chartPoints = points.map((d) => ({
    metric: d.metric,
    value: d.value === null ? null : Math.min(d.value, max),
    actualValue: d.value,
    reference:
      d.reference === null || d.reference === undefined
        ? d.reference
        : Math.min(d.reference, max),
    actualReference: d.reference,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={chartPoints} outerRadius="72%">
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
          formatter={(value: number, name: string, item: { dataKey?: string | number; payload?: Record<string, number | null> }) => {
            const actual =
              item?.dataKey === 'reference'
                ? item.payload?.actualReference
                : item.payload?.actualValue
            return [formatPercent(actual ?? value), name]
          }}
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
