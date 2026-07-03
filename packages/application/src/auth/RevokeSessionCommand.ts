import { Result, DomainError, UnauthorizedError } from '@bcp/domain'
import { IRefreshTokenRepository } from '@bcp/contracts'

import { hashRefreshToken } from './security/refreshToken'

export interface RevokeSessionInput {
  userId: string
  refreshToken: string
}

export class RevokeSessionCommand {
  constructor(private readonly refreshTokenRepository: IRefreshTokenRepository) {}

  async execute(input: RevokeSessionInput): Promise<Result<void, DomainError>> {
    const tokenHash = hashRefreshToken(input.refreshToken)
    const recordResult = await this.refreshTokenRepository.findByTokenHash(tokenHash)
    if (recordResult.isFail()) {
      return Result.fail(new UnauthorizedError('Invalid refresh token'))
    }
    const record = recordResult.getValue()

    if (record.userId !== input.userId) {
      return Result.fail(new UnauthorizedError('Invalid refresh token'))
    }

    return this.refreshTokenRepository.revoke(record.id)
  }
}
