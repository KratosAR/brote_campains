import { Request, Response, NextFunction } from 'express'
import { RequestContext } from '@bcp/infrastructure'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by Express's type augmentation pattern
  namespace Express {
    interface Request {
      correlationId: string
    }
  }
}

export function correlationIdMiddleware(req: Request, _res: Response, next: NextFunction) {
  const context = RequestContext.init(req.headers['x-correlation-id'] as string | undefined)
  req.correlationId = context.correlationId
  RequestContext.run(context, next)
}
