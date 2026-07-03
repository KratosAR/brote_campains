import jwt from 'jsonwebtoken'
import { UserRole, Permission } from '@bcp/domain'

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60

// Pin the algorithm on both sign and verify to rule out "alg: none" and
// algorithm-confusion attacks, regardless of jsonwebtoken defaults.
const JWT_ALGORITHM = 'HS256' as const

export interface AccessTokenPayload {
  sub: string
  workspaceId: string
  role: UserRole
  permissions: Permission[]
}

export function signAccessToken(payload: AccessTokenPayload, secret: string): string {
  return jwt.sign(payload, secret, { algorithm: JWT_ALGORITHM, expiresIn: ACCESS_TOKEN_TTL_SECONDS })
}

/** Throws jwt.JsonWebTokenError / jwt.TokenExpiredError on invalid/expired token. */
export function verifyAccessToken(token: string, secret: string): AccessTokenPayload {
  return jwt.verify(token, secret, { algorithms: [JWT_ALGORITHM] }) as AccessTokenPayload
}
