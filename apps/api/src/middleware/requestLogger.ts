import { Request, Response, NextFunction } from 'express'
import pino from 'pino'

const logger = pino({
  transport:
    process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
})

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    logger.info({
      correlationId: req.correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - start,
    })
  })

  next()
}

export { logger }
