import { memo } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { formatDecimal, formatPercent } from '@/utils/format'
import { getVizColors, tooltipStyle } from './chartTheme'

export interface TrendSeries {
  key: string
  name: string
  /** Fixed categorical slot (0–7) so colors follow the metric. */
  slot: number
}

export interface TrendPoint {
  period: string
  [metric: string]: string | number | null
}

interface TrendChartProps {
  data: TrendPoint[]
  series: TrendSeries[]
  /** 'percent' scales adaptively (>100 % allowed); 'csat' is fixed 1–5. */
  scale: 'percent' | 'csat' | 'count'
  height?: number
}

/**
 * Line chart of metric development across periods. One value scale per
 * chart — percent KPIs and 1–5 CSAT averages are never mixed.
 */
export const TrendChart = memo(function TrendChart({
  data,
  series,
  scale,
  height = 280,
}: TrendChartProps) {
  const { theme } = useTheme()
  const colors = getVizColors(theme)

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Žádná data k zobrazení
      </div>
    )
  }

  const numeric = data.flatMap((point) =>
    series
      .map((s) => point[s.key])
      .filter((v): v is number => typeof v === 'number'),
  )
  const max = numeric.length > 0 ? Math.max(...numeric) : 0

  const domain: [number, number | string] =
    scale === 'csat'
      ? [0, 5]
      : scale === 'percent'
        ? [0, Math.max(Math.ceil((max + 5) / 10) * 10, 110)]
        : [0, 'auto']

  const formatValue = (value: number) =>
    scale === 'percent'
      ? formatPercent(value)
      : scale === 'csat'
        ? formatDecimal(value)
        : String(value)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="period"
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
        />
        <YAxis
          domain={domain}
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          allowDecimals={scale !== 'count'}
        />
        <Tooltip
          contentStyle={tooltipStyle(colors)}
          formatter={(value: number, name: string) => [formatValue(value), name]}
        />
        {series.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 12, color: colors.muted }}
            iconType="plainline"
          />
        )}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={colors.series[s.slot]}
            strokeWidth={2}
            dot={{ r: 3, fill: colors.series[s.slot], strokeWidth: 0 }}
            activeDot={{ r: 5, stroke: colors.surface, strokeWidth: 2 }}
            connectNulls
            isAnimationActive={data.length <= 40}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
})
