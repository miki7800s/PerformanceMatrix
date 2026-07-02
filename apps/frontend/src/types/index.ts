export type {
  OperatorRecord,
  OperatorMetricKey,
  PeriodMeta,
  HealthResponse,
  AiRecommendationRequest,
  AiRecommendationResponse,
} from '@care-dashboard/shared'

/** Result of parsing one Excel file, grouped by period. */
export interface ParsedImport {
  fileName: string
  /** Periods found in the file, each with its rows. */
  periods: ParsedPeriod[]
  /** Non-fatal issues (skipped rows etc.) surfaced to the user. */
  warnings: string[]
}

export interface ParsedPeriod {
  period: string
  records: import('@care-dashboard/shared').OperatorRecord[]
}

/** How to resolve a period that already exists in the database. */
export type ConflictResolution = 'overwrite' | 'keep' | 'cancel'

/** Aggregated stats for one manager's team. */
export interface TeamSummary {
  manager: string
  operatorCount: number
  avgTotalPerformance: number | null
  avgProductivity: number | null
  avgInternalRating: number | null
  avgCsatCall: number | null
  avgCsatChat: number | null
  avgCsatCct: number | null
  best: import('@care-dashboard/shared').OperatorRecord | null
  worst: import('@care-dashboard/shared').OperatorRecord | null
}
