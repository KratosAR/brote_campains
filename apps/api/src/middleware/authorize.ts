import { Request, Response, NextFunction } from 'express'
import { Permission } from '@bcp/domain'

export function authorize(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' })
      return
    }

    if (!req.user.permissions.includes(permission)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions' })
      return
    }

    next()
  }
}
