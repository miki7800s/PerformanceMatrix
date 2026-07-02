import { memo } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSettings } from '@/hooks/useSettings'
import { getVizColors, toneColor } from '@/components/charts/chartTheme'
import {
  formatPercent,
  getPerformanceTone,
} from '@/utils/format'

interface ProgressRingProps {
  label: string
  value: number | null
  /** Ring closes at this value; values above keep the full ring + glow. */
  target?: number
  size?: number
}

/**
 * Animated KPI ring (part of the operator "Performance DNA"). The ring
 * fills toward the target; above-target values close the ring fully
 * and are highlighted — 100 % is not a ceiling.
 */
export const ProgressRing = memo(function ProgressRing({
  label,
  value,
  target = 100,
  size = 92,
}: ProgressRingProps) {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const colors = getVizColors(theme)
  const tone = getPerformanceTone(value, settings.thresholds)
  const color = toneColor(tone, colors)

  const stroke = 7
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const ratio =
    value === null ? 0 : Math.max(0, Math.min(1, value / target))
  const overTarget = value !== null && value > target

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={colors.grid}
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - ratio)}
            style={{
              transition: 'stroke-dashoffset 0.8s ease, stroke 0.3s ease',
              filter: overTarget ? `drop-shadow(0 0 5px ${color})` : undefined,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: value === null ? undefined : color }}
          >
            {value === null ? '–' : formatPercent(value).replace(' %', '')}
          </span>
        </div>
      </div>
      <span className="max-w-24 truncate text-center text-xs text-muted-foreground">
        {label}
      </span>
    </div>
  )
})
