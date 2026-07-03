import { randomUUID } from 'crypto'
import { UserRole, RolePermissions } from '@bcp/domain'
import { IRefreshTokenRepository } from '@bcp/contracts'

import { signAccessToken, ACCESS_TOKEN_TTL_SECONDS } from './accessToken'
import { generateRefreshToken, hashRefreshToken, REFRESH_TOKEN_TTL_MS } from './refreshToken'

export interface TokenPair {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function issueTokenPair(params: {
  userId: string
  workspaceId: string
  role: UserRole
  jwtSecret: string
  refreshTokenRepository: IRefreshTokenRepository
}): Promise<TokenPair> {
  const accessToken = signAccessToken(
    {
      sub: params.userId,
      workspaceId: params.workspaceId,
      role: params.role,
      permissions: RolePermissions[params.role],
    },
    params.jwtSecret,
  )

  const refreshToken = generateRefreshToken()
  const now = new Date()

  const result = await params.refreshTokenRepository.save({
    id: randomUUID(),
    userId: params.userId,
    tokenHash: hashRefreshToken(refreshToken),
    expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
    revokedAt: null,
    createdAt: now,
  })

  if (result.isFail()) {
    throw result.getError()
  }

  return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS }
}
