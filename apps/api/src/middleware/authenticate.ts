import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, AccessTokenPayload } from '@bcp/application'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required by Express's type augmentation pattern
  namespace Express {
    interface Request {
      user?: AccessTokenPayload
    }
  }
}

export function authenticate(jwtSecret: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization
    if (!header || !header.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' })
      return
    }

    try {
      req.user = verifyAccessToken(header.slice('Bearer '.length), jwtSecret)
      next()
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' })
    }
  }
}
