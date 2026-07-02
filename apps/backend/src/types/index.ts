export type {
  AiRecommendationRequest,
  AiRecommendationResponse,
  HealthResponse,
  OperatorRecord,
} from '@care-dashboard/shared'

export interface ApiError {
  error: string
  detail?: string
}
