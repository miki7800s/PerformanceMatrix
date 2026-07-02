import type { OperatorRecord } from '@/types'
import type { TeamSummary } from '@/types'

/** Average of non-null values, or null when nothing is measurable. */
export function average(values: (number | null | undefined)[]): number | null {
  const valid = values.filter(
    (v): v is number => v !== null && v !== undefined && !Number.isNaN(v),
  )
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}

export function averageOf(
  records: OperatorRecord[],
  key: keyof OperatorRecord,
): number | null {
  return average(records.map((r) => r[key] as number | null))
}

export interface DashboardSummary {
  operatorCount: number
  managerCount: number
  avgTotalPerformance: number | null
  avgProductivity: number | null
  avgInternalRating: number | null
  avgCsatCall: number | null
  avgCsatChat: number | null
  avgCsatCct: number | null
}

export function computeSummary(records: OperatorRecord[]): DashboardSummary {
  return {
    operatorCount: records.length,
    managerCount: new Set(records.map((r) => r.manager)).size,
    avgTotalPerformance: averageOf(records, 'totalPerformance'),
    avgProductivity: averageOf(records, 'productivity'),
    avgInternalRating: averageOf(records, 'internalRating'),
    avgCsatCall: averageOf(records, 'csatCallAverage'),
    avgCsatChat: averageOf(records, 'csatChatAverage'),
    avgCsatCct: averageOf(records, 'csatCctAverage'),
  }
}

/** Top/bottom N by Total Performance; rows without the KPI are excluded. */
export function rankByTotalPerformance(
  records: OperatorRecord[],
): OperatorRecord[] {
  return records
    .filter((r) => r.totalPerformance !== null)
    .sort((a, b) => b.totalPerformance! - a.totalPerformance!)
}

export function computeTeams(records: OperatorRecord[]): TeamSummary[] {
  const byManager = new Map<string, OperatorRecord[]>()
  for (const record of records) {
    const list = byManager.get(record.manager) ?? []
    list.push(record)
    byManager.set(record.manager, list)
  }

  return [...byManager.entries()]
    .map(([manager, members]) => {
      const ranked = rankByTotalPerformance(members)
      return {
        manager,
        operatorCount: members.length,
        avgTotalPerformance: averageOf(members, 'totalPerformance'),
        avgProductivity: averageOf(members, 'productivity'),
        avgInternalRating: averageOf(members, 'internalRating'),
        avgCsatCall: averageOf(members, 'csatCallAverage'),
        avgCsatChat: averageOf(members, 'csatChatAverage'),
        avgCsatCct: averageOf(members, 'csatCctAverage'),
        best: ranked[0] ?? null,
        worst: ranked.length > 0 ? ranked[ranked.length - 1] : null,
      } satisfies TeamSummary
    })
    .sort(
      (a, b) =>
        (b.avgTotalPerformance ?? -Infinity) -
        (a.avgTotalPerformance ?? -Infinity),
    )
}

/** Descriptive statistics of a numeric sample (nulls ignored). */
export interface DescriptiveStats {
  count: number
  min: number | null
  max: number | null
  median: number | null
  /** Population standard deviation. */
  stdDev: number | null
  /** Population variance. */
  variance: number | null
}

export function computeStats(
  values: (number | null | undefined)[],
): DescriptiveStats {
  const valid = values
    .filter(
      (v): v is number => v !== null && v !== undefined && !Number.isNaN(v),
    )
    .sort((a, b) => a - b)
  if (valid.length === 0) {
    return {
      count: 0,
      min: null,
      max: null,
      median: null,
      stdDev: null,
      variance: null,
    }
  }
  const mid = Math.floor(valid.length / 2)
  const median =
    valid.length % 2 === 0 ? (valid[mid - 1] + valid[mid]) / 2 : valid[mid]
  const mean = valid.reduce((sum, v) => sum + v, 0) / valid.length
  const variance =
    valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / valid.length
  return {
    count: valid.length,
    min: valid[0],
    max: valid[valid.length - 1],
    median,
    stdDev: Math.sqrt(variance),
    variance,
  }
}

/**
 * Rank (1 = best) and percentile (0–100, share of values the given one
 * beats or ties) of `value` within `values`. Nulls are excluded.
 */
export function rankAndPercentile(
  value: number | null,
  values: (number | null)[],
): { rank: number | null; total: number; percentile: number | null } {
  const valid = values.filter(
    (v): v is number => v !== null && !Number.isNaN(v),
  )
  if (value === null || Number.isNaN(value) || valid.length === 0) {
    return { rank: null, total: valid.length, percentile: null }
  }
  const better = valid.filter((v) => v > value).length
  const atOrBelow = valid.filter((v) => v <= value).length
  return {
    rank: better + 1,
    total: valid.length,
    percentile: (atOrBelow / valid.length) * 100,
  }
}

export interface HistogramBin {
  label: string
  from: number
  to: number
  count: number
}

/**
 * Buckets values into equal-width bins. The domain adapts to the data,
 * so values above 100 % scale naturally instead of being treated as
 * outliers.
 */
export function buildHistogram(
  values: (number | null)[],
  binWidth = 5,
): HistogramBin[] {
  const valid = values.filter(
    (v): v is number => v !== null && !Number.isNaN(v),
  )
  if (valid.length === 0) return []

  const min = Math.floor(Math.min(...valid) / binWidth) * binWidth
  const max = Math.ceil((Math.max(...valid) + 0.0001) / binWidth) * binWidth
  const bins: HistogramBin[] = []
  for (let from = min; from < max; from += binWidth) {
    bins.push({
      label: `${from}–${from + binWidth}`,
      from,
      to: from + binWidth,
      count: 0,
    })
  }
  for (const value of valid) {
    const index = Math.min(
      Math.floor((value - min) / binWidth),
      bins.length - 1,
    )
    bins[index].count += 1
  }
  return bins
}
