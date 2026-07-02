import type { NextFunction, Request, Response } from 'express'
import type { AiRecommendationRequest } from '@care-dashboard/shared'
import * as aiService from '../services/ai.service'

export async function postRecommendations(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const body = req.body as Partial<AiRecommendationRequest> | undefined
    if (!body?.period || !Array.isArray(body.records)) {
      res.status(400).json({
        error: 'Neplatný požadavek: očekávám { period, records }.',
      })
      return
    }
    const result = await aiService.getRecommendations(
      body as AiRecommendationRequest,
    )
    res.status(200).json(result)
  } catch (err) {
    next(err)
  }
}
