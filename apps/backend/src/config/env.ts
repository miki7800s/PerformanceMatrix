export const config = {
  port: Number(process.env.PORT ?? 3001),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  serviceName: 'care-dashboard-backend',
  version: '0.1.0',
} as const
