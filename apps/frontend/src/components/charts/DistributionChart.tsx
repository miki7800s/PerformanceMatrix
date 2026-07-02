import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { buildHistogram } from '@/utils/analytics'
import { getVizColors, tooltipStyle } from './chartTheme'

interface DistributionChartProps {
  values: (number | null)[]
  binWidth?: number
  /** Label of the metric, e.g. "Total Performance (%)". */
  unit?: string
}

/**
 * Histogram of a KPI. The domain follows the data, so values above
 * 100 % extend the axis instead of being clipped.
 */
export const DistributionChart = memo(function DistributionChart({
  values,
  binWidth = 5,
  unit = '%',
}: DistributionChartProps) {
  const { theme } = useTheme()
  const colors = getVizColors(theme)
  const bins = buildHistogram(values, binWidth)

  if (bins.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Žádná data k zobrazení
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={bins} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="label"
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          contentStyle={tooltipStyle(colors)}
          formatter={(value: number) => [value, 'Počet operátorů']}
          labelFormatter={(label: string) => `${label} ${unit}`}
        />
        <Bar
          dataKey="count"
          fill={colors.series[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  )
})
