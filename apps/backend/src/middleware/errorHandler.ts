import type { NextFunction, Request, Response } from 'express'

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Not found' })
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  console.error(err)
  const detail = err instanceof Error ? err.message : String(err)
  res.status(500).json({ error: 'Internal server error', detail })
}
