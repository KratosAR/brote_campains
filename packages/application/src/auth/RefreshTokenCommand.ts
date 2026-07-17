import { Result, DomainError, UnauthorizedError } from '@bcp/domain'
import { IWorkspaceUserRepository, IRefreshTokenRepository } from '@bcp/contracts'

import { hashRefreshToken } from './security/refreshToken'
import { issueTokenPair, TokenPair } from './security/issueTokenPair'

export interface RefreshTokenInput {
  refreshToken: string
}

const INVALID_TOKEN_MESSAGE = 'Invalid or expired refresh token'

export class RefreshTokenCommand {
  constructor(
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly workspaceUserRepository: IWorkspaceUserRepository,
    private readonly jwtSecret: string,
  ) {}

  async execute(input: RefreshTokenInput): Promise<Result<TokenPair, DomainError>> {
    const tokenHash = hashRefreshToken(input.refreshToken)
    const recordResult = await this.refreshTokenRepository.findByTokenHash(tokenHash)
    if (recordResult.isFail()) {
      return Result.fail(new UnauthorizedError(INVALID_TOKEN_MESSAGE))
    }
    const record = recordResult.getValue()

    if (record.revokedAt !== null || record.expiresAt.getTime() <= Date.now()) {
      return Result.fail(new UnauthorizedError(INVALID_TOKEN_MESSAGE))
    }

    // Rotation: invalidate the presented token before issuing a new pair.
    // revoke() is conditional — if a concurrent request already rotated this
    // token, we lose the race and must reject (401), not issue a second pair.
    const revokeResult = await this.refreshTokenRepository.revoke(record.id)
    if (revokeResult.isFail()) {
      return Result.fail(new UnauthorizedError(INVALID_TOKEN_MESSAGE))
    }

    const membershipResult = await this.workspaceUserRepository.findByUserId(record.userId)
    if (membershipResult.isFail()) {
      return Result.fail(new UnauthorizedError(INVALID_TOKEN_MESSAGE))
    }
    const membership = membershipResult.getValue()

    const tokensResult = await issueTokenPair({
      userId: record.userId,
      workspaceId: membership.workspaceId.toString(),
      role: membership.role,
      jwtSecret: this.jwtSecret,
      refreshTokenRepository: this.refreshTokenRepository,
    })
    if (tokensResult.isFail()) return Result.fail(tokensResult.getError())

    return Result.ok(tokensResult.getValue())
  }
}
