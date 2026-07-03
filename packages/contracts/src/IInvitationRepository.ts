import { UserRole, Result, NotFoundError, DomainError } from '@bcp/domain'

export interface InvitationRecord {
  id: string
  workspaceId: string
  email: string
  role: UserRole
  tokenHash: string
  invitedByUserId: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export interface IInvitationRepository {
  findByTokenHash(tokenHash: string): Promise<Result<InvitationRecord, NotFoundError>>
  save(record: InvitationRecord): Promise<Result<void, DomainError>>
}
