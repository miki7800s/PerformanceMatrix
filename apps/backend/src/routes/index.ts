import { Router } from 'express'
import { healthRouter } from './health.routes'
import { aiRouter } from './ai.routes'

export const apiRouter = Router()

apiRouter.use('/health', healthRouter)
apiRouter.use('/ai', aiRouter)
