import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { formatPercent, getPerformanceTone } from '@/utils/format'
import { getVizColors, toneColor, tooltipStyle } from './chartTheme'

export interface KpiBarDatum {
  metric: string
  value: number | null
}

interface KpiBarChartProps {
  data: KpiBarDatum[]
}

/**
 * Percent KPIs side by side, colored by status tone (good / warning /
 * critical vs. the 100% target). Scale adapts to values above 100 %.
 */
export const KpiBarChart = memo(function KpiBarChart({ data }: KpiBarChartProps) {
  const { theme } = useTheme()
  const colors = getVizColors(theme)

  const points = data.filter((d) => d.value !== null)
  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Žádná data k zobrazení
      </div>
    )
  }

  const max = Math.max(...points.map((d) => d.value!), 100)

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={points}
        margin={{ top: 20, right: 8, left: -16, bottom: 24 }}
      >
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="metric"
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
          angle={-20}
          textAnchor="end"
          height={48}
          interval={0}
        />
        <YAxis
          domain={[0, Math.ceil((max + 5) / 10) * 10]}
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit=" %"
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          contentStyle={tooltipStyle(colors)}
          formatter={(value: number) => [formatPercent(value), 'Hodnota']}
        />
        <ReferenceLine
          y={100}
          stroke={colors.muted}
          strokeDasharray="4 4"
          label={{
            value: '100 %',
            position: 'right',
            fill: colors.muted,
            fontSize: 10,
          }}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {points.map((entry) => (
            <Cell
              key={entry.metric}
              fill={toneColor(getPerformanceTone(entry.value), colors)}
            />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatPercent(value)}
            style={{ fill: colors.ink, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})
