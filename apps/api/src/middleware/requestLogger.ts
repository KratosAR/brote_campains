import { Request, Response, NextFunction } from 'express'
import pino from 'pino'

const logger = pino({
  transport:
    process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
})

// The invitation-accept route carries a secret token in the URL path — never log it.
function redactSecrets(path: string): string {
  return path.replace(/(\/invitations\/)[^/]+/, '$1:token')
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on('finish', () => {
    logger.info({
      correlationId: req.correlationId,
      method: req.method,
      path: redactSecrets(req.path),
      status: res.statusCode,
      durationMs: Date.now() - start,
    })
  })

  next()
}

export { logger }
