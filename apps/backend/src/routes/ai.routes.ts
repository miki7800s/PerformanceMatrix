import { Router } from 'express'
import { postRecommendations } from '../controllers/ai.controller'

export const aiRouter = Router()

// Part two of the project will add the real AI Coach behind this route.
aiRouter.post('/recommendations', postRecommendations)
