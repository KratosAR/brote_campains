import { Request, Response, NextFunction } from 'express'
import { ZodSchema } from 'zod'
import { formatValidationErrors, toErrorResponse } from '../utils/validation'

export function validateRequest(schema: ZodSchema, source: 'body' | 'query' = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = source === 'body' ? req.body : req.query
    const parsed = schema.safeParse(data)

    if (!parsed.success) {
      const errors = formatValidationErrors(parsed.error)
      res.status(400).json(toErrorResponse(errors))
      return
    }

    req.validated = parsed.data
    next()
  }
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validated?: any
    }
  }
}
