import { Request, Response, NextFunction } from 'express'
import { ulid } from 'ulid'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by Express's type augmentation pattern
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
