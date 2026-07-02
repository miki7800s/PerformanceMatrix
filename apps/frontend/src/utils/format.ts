const percentFormatter = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

const decimalFormatter = new Intl.NumberFormat('cs-CZ', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const intFormatter = new Intl.NumberFormat('cs-CZ', {
  maximumFractionDigits: 0,
})

/** 103.4 → "103,4 %"; null → "–" */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return `${percentFormatter.format(value)} %`
}

/** 4.523 → "4,52"; null → "–" */
export function formatDecimal(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return decimalFormatter.format(value)
}

export function formatInt(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '–'
  return intFormatter.format(value)
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Tone of a percent KPI. 100 % is NOT a ceiling — values above it are
 * excellent, not errors. Five information-bearing levels:
 * excellent (green)  = well above target
 * met       (blue)   = target met
 * slight    (yellow) = slightly below target
 * attention (orange) = needs attention
 * critical  (red)    = critical
 */
export type PerformanceTone =
  | 'excellent'
  | 'met'
  | 'slight'
  | 'attention'
  | 'critical'
  | 'none'

export const TONE_LABELS: Record<Exclude<PerformanceTone, 'none'>, string> = {
  excellent: 'Výrazně nad cílem',
  met: 'Splněný cíl',
  slight: 'Mírně pod cílem',
  attention: 'Vyžaduje pozornost',
  critical: 'Kritický stav',
}

/** Color boundaries for percent KPIs, configurable in Settings. */
export interface KpiThresholds {
  /** value ≥ good → green */
  good: number
  /** value ≥ ok → neutral */
  ok: number
  /** value ≥ warning → orange, below → red */
  warning: number
}

export const DEFAULT_THRESHOLDS: KpiThresholds = {
  good: 100,
  ok: 95,
  warning: 85,
}

// Module-level snapshot kept in sync by SettingsProvider so pure
// helpers respect the configured bounds without prop-drilling.
let activeThresholds: KpiThresholds = DEFAULT_THRESHOLDS

export function setActiveThresholds(thresholds: KpiThresholds) {
  activeThresholds = thresholds
}

export function getPerformanceTone(
  value: number | null | undefined,
  thresholds: KpiThresholds = activeThresholds,
): PerformanceTone {
  if (value === null || value === undefined || Number.isNaN(value))
    return 'none'
  // "Well above target" = 5 p.p. over the configured target.
  if (value >= thresholds.good + 5) return 'excellent'
  if (value >= thresholds.good) return 'met'
  if (value >= thresholds.ok) return 'slight'
  if (value >= thresholds.warning) return 'attention'
  return 'critical'
}

/** Tone of a CSAT average on the 1–5 scale. */
export function getCsatTone(
  value: number | null | undefined,
): PerformanceTone {
  if (value === null || value === undefined || Number.isNaN(value))
    return 'none'
  if (value >= 4.7) return 'excellent'
  if (value >= 4.3) return 'met'
  if (value >= 4) return 'slight'
  if (value >= 3.5) return 'attention'
  return 'critical'
}
