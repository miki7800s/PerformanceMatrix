/**
 * Shared domain types for the Customer Care performance dashboard.
 * Used by the frontend today; the backend will consume the same
 * shapes once AI recommendations are added in part two.
 */

/** One row of a Power BI export = one operator in one period. */
export interface OperatorRecord {
  /** Stable id: `${period}::${fullName}` */
  id: string;
  /** Value of the "Month / Name" column, e.g. "2026-05" or "Květen 2026". */
  period: string;
  /** Direct supervisor (Team Leader) — column "Manager". */
  manager: string;
  /** Operator name — column "FullName2". */
  fullName: string;
  /** Percentages are stored as 0–100+ numbers (103 = 103 %). */
  attendance: number | null;
  productivity: number | null;
  productivityPerformance: number | null;
  csatCallCount: number | null;
  /** CSAT averages keep their native scale (typically 1–5). */
  csatCallAverage: number | null;
  csatCallPerformance: number | null;
  csatCctCount: number | null;
  csatCctAverage: number | null;
  csatCctPerformance: number | null;
  csatChatCount: number | null;
  csatChatAverage: number | null;
  csatChatPerformance: number | null;
  internalRating: number | null;
  /** Main KPI. Values above 100 are valid and expected. */
  totalPerformance: number | null;
}

/** Numeric field keys of {@link OperatorRecord}. */
export type OperatorMetricKey = Exclude<
  keyof OperatorRecord,
  'id' | 'period' | 'manager' | 'fullName'
>;

/** Metadata about one imported period stored in IndexedDB. */
export interface PeriodMeta {
  /** Same as the period label. */
  id: string;
  label: string;
  importedAt: string;
  recordCount: number;
  /** Distinct managers in the period. Missing on very old imports. */
  managerCount?: number;
  fileName: string;
}

/** Payload the frontend will eventually send to the AI backend. */
export interface AiRecommendationRequest {
  period: string;
  records: OperatorRecord[];
}

export interface AiRecommendationResponse {
  available: boolean;
  message: string;
  recommendations: unknown[];
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
}
