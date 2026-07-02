import type { Request, Response } from 'express'
import type { HealthResponse } from '@care-dashboard/shared'
import { config } from '../config/env'

export function getHealth(_req: Request, res: Response<HealthResponse>) {
  res.json({
    status: 'ok',
    service: config.serviceName,
    version: config.version,
    timestamp: new Date().toISOString(),
  })
}
