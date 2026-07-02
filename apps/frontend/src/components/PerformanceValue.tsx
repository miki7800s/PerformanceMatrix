import { cn } from '@/utils/cn'
import { useSettings } from '@/hooks/useSettings'
import {
  formatDecimal,
  formatPercent,
  getCsatTone,
  getPerformanceTone,
  type PerformanceTone,
} from '@/utils/format'

const TONE_CLASSES: Record<PerformanceTone, string> = {
  excellent: 'text-[#2e7d00] dark:text-[#5ed312] font-semibold',
  met: 'text-[#0071b2] dark:text-[#41b5f4] font-medium',
  slight: 'text-[#9a6a00] dark:text-[#e0a92c] font-medium',
  attention: 'text-[#b3541e] dark:text-[#f09e63] font-semibold',
  critical: 'text-[#b02020] dark:text-[#f07575] font-semibold',
  none: 'text-muted-foreground',
}

interface PerformanceValueProps {
  value: number | null | undefined
  className?: string
}

/** Percent KPI with a status tone. Values above 100 % are highlighted as excellent. */
export function PercentValue({ value, className }: PerformanceValueProps) {
  // Subscribe to settings so configured KPI thresholds apply live.
  const { settings } = useSettings()
  const tone = getPerformanceTone(value, settings.thresholds)
  return (
    <span className={cn('tabular-nums', TONE_CLASSES[tone], className)}>
      {formatPercent(value)}
    </span>
  )
}

/** CSAT average (1–5) with a status tone. */
export function CsatValue({ value, className }: PerformanceValueProps) {
  const tone = getCsatTone(value)
  return (
    <span className={cn('tabular-nums', TONE_CLASSES[tone], className)}>
      {formatDecimal(value)}
    </span>
  )
}
