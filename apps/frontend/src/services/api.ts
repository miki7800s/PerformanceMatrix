import type {
  AiRecommendationRequest,
  AiRecommendationResponse,
  HealthResponse,
} from '@/types'

/**
 * Thin client for the local backend (localhost:3001, proxied through
 * Vite as /api). The backend carries no data today — it only exposes
 * the health check and the placeholder AI endpoint for part two.
 */
const BASE_URL = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`API ${path} selhalo (${response.status})`)
  }
  return response.json() as Promise<T>
}

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health')
}

export function getAiRecommendations(
  payload: AiRecommendationRequest,
): Promise<AiRecommendationResponse> {
  return request<AiRecommendationResponse>('/ai/recommendations', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
