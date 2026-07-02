import { Request, Response, NextFunction } from 'express'
import { ulid } from 'ulid'

declare global {
  namespace Express {
    interface Request {
      correlationId: string
    }
  }
}

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  req.correlationId = (req.headers['x-correlation-id'] as string) || ulid()
  next()
}
