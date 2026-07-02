import express from 'express'
import cors from 'cors'
import { config } from './config/env'
import { apiRouter } from './routes'
import { errorHandler, notFoundHandler } from './middleware/errorHandler'

export function createApp() {
  const app = express()

  app.use(cors({ origin: config.corsOrigin }))
  app.use(express.json({ limit: '10mb' }))

  app.use('/api', apiRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
