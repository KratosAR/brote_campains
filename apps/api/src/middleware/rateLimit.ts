import rateLimit from 'express-rate-limit'

export const globalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/health'
  },
})

// Brute-force guard for credential endpoints (login, register, refresh,
// invitation accept). 20 attempts / 15 min per IP.
// ponytail: in-memory store, per-instance — swap for a Redis store when the
// API runs multi-instance (in-memory repos have the same ceiling anyway).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: 'Too many attempts, please try again later' },
})

export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per workspace (via header)
  message: { success: false, error: 'Workspace rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by workspace ID if available, fallback to default IP key
    const workspaceId = Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    return (workspaceId || id || '') as string
  },
  skip: (req) => {
    // When no workspace ID, use default rate limiter (by IP)
    const workspaceId = Array.isArray(req.params.workspaceId) ? req.params.workspaceId[0] : req.params.workspaceId
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    return !workspaceId && !id
  },
})
