import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { formatDecimal, formatPercent } from '@/utils/format'
import { getVizColors, tooltipStyle } from './chartTheme'

export interface ComparisonDatum {
  metric: string
  a: number | null
  b: number | null
}

interface PeriodComparisonChartProps {
  data: ComparisonDatum[]
  labelA: string
  labelB: string
  scale: 'percent' | 'csat'
}

/** Grouped bars: the same metrics in two periods side by side. */
export const PeriodComparisonChart = memo(function PeriodComparisonChart({
  data,
  labelA,
  labelB,
  scale,
}: PeriodComparisonChartProps) {
  const { theme } = useTheme()
  const colors = getVizColors(theme)

  const points = data.filter((d) => d.a !== null || d.b !== null)
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Žádná data k zobrazení
      </div>
    )
  }

  const numeric = points.flatMap((d) =>
    [d.a, d.b].filter((v): v is number => v !== null),
  )
  const max = Math.max(...numeric)
  const domain: [number, number] =
    scale === 'csat' ? [0, 5] : [0, Math.max(Math.ceil((max + 5) / 10) * 10, 110)]

  const formatValue = (value: number) =>
    scale === 'percent' ? formatPercent(value) : formatDecimal(value)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={points} margin={{ top: 8, right: 8, left: -12, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="metric"
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
          angle={-15}
          textAnchor="end"
          height={44}
          interval={0}
        />
        <YAxis
          domain={domain}
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          contentStyle={tooltipStyle(colors)}
          formatter={(value: number, name: string) => [formatValue(value), name]}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          dataKey="a"
          name={labelA}
          fill={colors.series[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="b"
          name={labelB}
          fill={colors.series[1]}
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
      </BarChart>
    </ResponsiveContainer>
  )
})
