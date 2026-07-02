import { memo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useTheme } from '@/hooks/useTheme'
import { formatDecimal } from '@/utils/format'
import { getVizColors, tooltipStyle } from './chartTheme'

interface CsatAveragesChartProps {
  call: number | null
  chat: number | null
  cct: number | null
}

/** Average CSAT per channel on its native 1–5 scale. */
export const CsatAveragesChart = memo(function CsatAveragesChart({ call, chat, cct }: CsatAveragesChartProps) {
  const { theme } = useTheme()
  const colors = getVizColors(theme)

  // Fixed slot per channel, so a missing channel never repaints the rest.
  const data = [
    { name: 'CSAT Call', value: call, slot: 0 },
    { name: 'CSAT Chat', value: chat, slot: 1 },
    { name: 'CSAT CCT', value: cct, slot: 2 },
  ].filter((d) => d.value !== null)

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Žádná data k zobrazení
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 20, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={colors.grid} />
        <XAxis
          dataKey="name"
          tick={{ fill: colors.muted, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: colors.axis }}
        />
        <YAxis
          domain={[0, 5]}
          tick={{ fill: colors.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          contentStyle={tooltipStyle(colors)}
          formatter={(value: number) => [formatDecimal(value), 'Průměr']}
        />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={colors.series[entry.slot]} />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(value: number) => formatDecimal(value)}
            style={{ fill: colors.ink, fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
})
