import { Request, Response, NextFunction } from 'express'

const REQUEST_TIMEOUT_MS = 30000 // 30 seconds

export function timeoutMiddleware(req: Request, res: Response, next: NextFunction) {
  const timeoutId = setTimeout(() => {
    if (!res.headersSent) {
      res.status(503).json({
        success: false,
        error: 'Request timeout - service temporarily unavailable. Try again.',
      })
    }
  }, REQUEST_TIMEOUT_MS)

  // Clear timeout if response finishes before timeout
  res.on('finish', () => {
    clearTimeout(timeoutId)
  })

  res.on('close', () => {
    clearTimeout(timeoutId)
  })

  next()
}
