import { randomBytes, createHash } from 'crypto'

export const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Random 256-bit opaque token. The plaintext is only ever returned to the client. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString('hex')
}

/** Only the hash is persisted — never the plaintext token. */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
