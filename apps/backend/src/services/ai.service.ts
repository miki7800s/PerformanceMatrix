import type {
  AiRecommendationRequest,
  AiRecommendationResponse,
} from '@care-dashboard/shared'

/**
 * Placeholder for the AI Coach that arrives in part two of the project.
 * The service boundary is already in place so that swapping in a real
 * implementation only touches this file.
 */
export async function getRecommendations(
  _request: AiRecommendationRequest,
): Promise<AiRecommendationResponse> {
  return {
    available: false,
    message:
      'AI doporučení zatím nejsou k dispozici. Tento endpoint je připraven pro druhou část projektu.',
    recommendations: [],
  }
}
