import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import type { TeamSummary } from '@/types'
import { formatPercent } from '@/utils/format'
import { getVizColors, tooltipStyle } from './chartTheme'

interface ManagerComparisonChartProps {
  teams: TeamSummary[]
}

/**
 * Horizontal comparison of team averages (Total Performance). The x-axis
 * follows the data — teams above 100 % extend the scale naturally.
 */
export const ManagerComparisonChart = memo(function ManagerComparisonChart({ teams }: ManagerComparisonChartProps) {
  const { theme } = useTheme()
  const colors = getVizColors(theme)

  const data = teams
    .filter((t) => t.avgTotalPerformance !== null)
    .map((t) => ({
      manager: t.manager,
      value: t.avgTotalPerformance!,
    }))

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Žádná data k zobrazení
      </div>
    )
  }

  const max = Math.max(...data.map((d) => d.value), 100)
  const height = Math.max(220, data.length * 44)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 8, right: 56, left: 16, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke={colors.grid} />
        <XAxis
          type="number"
          domain={[0, Math.ceil((max + 5) / 10) * 10]}
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
          unit=" %"
        />
        <YAxis
          type="category"
          dataKey="manager"
          width={140}
          tick={{ fill: colors.ink, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          contentStyle={tooltipStyle(colors)}
          formatter={(value: number) => [
            formatPercent(value),
            'Ø Total Performance',
          ]}
        />
        <ReferenceLine
          x={100}
          stroke={colors.muted}
          strokeDasharray="4 4"
          label={{
            value: '100 %',
            position: 'top',
            fill: colors.muted,
            fontSize: 11,
          }}
        />
        <Bar
          dataKey="value"
          fill={colors.series[0]}
          radius={[0, 4, 4, 0]}
          maxBarSize={22}
        >
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value: number) => formatPercent(value)}
            style={{ fill: colors.ink, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})
