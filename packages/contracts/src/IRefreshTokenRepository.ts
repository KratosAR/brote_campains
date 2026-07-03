import { Result, NotFoundError, DomainError } from '@bcp/domain'

export interface RefreshTokenRecord {
  id: string
  userId: string
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  createdAt: Date
}

export interface IRefreshTokenRepository {
  findByTokenHash(tokenHash: string): Promise<Result<RefreshTokenRecord, NotFoundError>>
  save(record: RefreshTokenRecord): Promise<Result<void, DomainError>>
  revoke(id: string): Promise<Result<void, DomainError>>
}
