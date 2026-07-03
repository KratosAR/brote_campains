// ponytail: no Prisma models exist yet for WorkspaceUser/RefreshToken persistence
// wiring or for Invitation at all (schema has WorkspaceUser/RefreshToken tables,
// but no repository implementation lands until the infrastructure sprint work
// is merged, and Invitation has no table at all). These in-memory stand-ins
// unblock Application + Presentation development; swap for Prisma-backed
// implementations once available. Not suitable for multi-instance production use.
import { Result, NotFoundError, WorkspaceUser } from '@bcp/domain'
import {
  IWorkspaceUserRepository,
  IRefreshTokenRepository,
  RefreshTokenRecord,
  IInvitationRepository,
  InvitationRecord,
} from '@bcp/contracts'

export class InMemoryWorkspaceUserRepository implements IWorkspaceUserRepository {
  private readonly memberships: WorkspaceUser[] = []

  async findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<Result<WorkspaceUser, NotFoundError>> {
    const found = this.memberships.find(
      (m) => m.userId.toString() === userId && m.workspaceId.toString() === workspaceId,
    )
    return found ? Result.ok(found) : Result.fail(new NotFoundError('WorkspaceUser', userId))
  }

  async findByUserId(userId: string): Promise<Result<WorkspaceUser, NotFoundError>> {
    const found = this.memberships.find((m) => m.userId.toString() === userId)
    return found ? Result.ok(found) : Result.fail(new NotFoundError('WorkspaceUser', userId))
  }

  async save(workspaceUser: WorkspaceUser): Promise<Result<void, never>> {
    const idx = this.memberships.findIndex(
      (m) =>
        m.userId.toString() === workspaceUser.userId.toString() &&
        m.workspaceId.toString() === workspaceUser.workspaceId.toString(),
    )
    if (idx >= 0) this.memberships[idx] = workspaceUser
    else this.memberships.push(workspaceUser)
    return Result.ok(undefined)
  }
}

export class InMemoryRefreshTokenRepository implements IRefreshTokenRepository {
  private readonly records = new Map<string, RefreshTokenRecord>()

  async findByTokenHash(tokenHash: string): Promise<Result<RefreshTokenRecord, NotFoundError>> {
    const found = [...this.records.values()].find((r) => r.tokenHash === tokenHash)
    return found ? Result.ok(found) : Result.fail(new NotFoundError('RefreshToken', tokenHash))
  }

  async save(record: RefreshTokenRecord): Promise<Result<void, never>> {
    this.records.set(record.id, record)
    return Result.ok(undefined)
  }

  async revoke(id: string): Promise<Result<void, NotFoundError>> {
    const record = this.records.get(id)
    // Conditional revoke: fail if already revoked, so concurrent refresh
    // rotations cannot both succeed with the same token (reuse window).
    // A Prisma implementation must mirror this with an atomic conditional
    // update (updateMany WHERE revokedAt IS NULL, checking affected rows).
    if (!record || record.revokedAt !== null) {
      return Result.fail(new NotFoundError('RefreshToken', id))
    }
    this.records.set(id, { ...record, revokedAt: new Date() })
    return Result.ok(undefined)
  }
}

export class InMemoryInvitationRepository implements IInvitationRepository {
  private readonly records = new Map<string, InvitationRecord>()

  async findByTokenHash(tokenHash: string): Promise<Result<InvitationRecord, NotFoundError>> {
    const found = [...this.records.values()].find((r) => r.tokenHash === tokenHash)
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Invitation', tokenHash))
  }

  async save(record: InvitationRecord): Promise<Result<void, never>> {
    this.records.set(record.id, record)
    return Result.ok(undefined)
  }
}
