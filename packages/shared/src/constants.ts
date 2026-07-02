import type { OperatorMetricKey, OperatorRecord } from './types'

/**
 * Mapping of required Excel headers (Power BI export) to record fields.
 * Header matching is case-insensitive and whitespace-tolerant.
 */
export const COLUMN_MAP: Record<string, keyof OperatorRecord> = {
  'Month / Name': 'period',
  'Manager': 'manager',
  'FullName2': 'fullName',
  'Attendance': 'attendance',
  'Productivity': 'productivity',
  'Productivity Performance': 'productivityPerformance',
  'CSAT Call Count': 'csatCallCount',
  'CSAT Call Average': 'csatCallAverage',
  'CSAT Call Performance': 'csatCallPerformance',
  'CSAT CCT Count': 'csatCctCount',
  'CSAT CCT Average': 'csatCctAverage',
  'CSAT CCT Performance': 'csatCctPerformance',
  'CSAT Chat Count': 'csatChatCount',
  'CSAT Chat Average': 'csatChatAverage',
  'CSAT Chat Performance': 'csatChatPerformance',
  'Internal Rating': 'internalRating',
  'Total Performance': 'totalPerformance',
}

export const REQUIRED_COLUMNS = Object.keys(COLUMN_MAP)

/**
 * Percent-like metrics. Excel percent cells often arrive as fractions
 * (1.03 instead of 103); these columns are normalised to a 0–100+ scale.
 */
export const PERCENT_METRICS: OperatorMetricKey[] = [
  'attendance',
  'productivity',
  'productivityPerformance',
  'csatCallPerformance',
  'csatCctPerformance',
  'csatChatPerformance',
  'internalRating',
  'totalPerformance',
]

/** Count metrics — integers, never scaled. */
export const COUNT_METRICS: OperatorMetricKey[] = [
  'csatCallCount',
  'csatCctCount',
  'csatChatCount',
]

/** CSAT averages — kept on their native scale (typically 1–5). */
export const AVERAGE_METRICS: OperatorMetricKey[] = [
  'csatCallAverage',
  'csatCctAverage',
  'csatChatAverage',
]
