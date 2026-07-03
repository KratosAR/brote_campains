import rateLimit from 'express-rate-limit'

// Brute-force guard for credential endpoints (login, register, refresh,
// invitation accept). 20 attempts / 15 min per IP.
// ponytail: in-memory store, per-instance — swap for a Redis store when the
// API runs multi-instance (in-memory repos have the same ceiling anyway).
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts, please try again later' },
})
