import { Result, NotFoundError, DomainError, Workspace, WorkspaceId, WorkspaceUser } from '@bcp/domain'
import {
  IUserRepository,
  User,
  IWorkspaceRepository,
  IWorkspaceUserRepository,
  IRefreshTokenRepository,
  RefreshTokenRecord,
  IInvitationRepository,
  InvitationRecord,
  IEventBus,
} from '@bcp/contracts'

export class InMemoryWorkspaceRepository implements IWorkspaceRepository {
  readonly workspaces = new Map<string, Workspace>()

  async findById(id: WorkspaceId): Promise<Result<Workspace, NotFoundError>> {
    const found = this.workspaces.get(id.toString())
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Workspace', id.toString()))
  }

  async findBySlug(slug: string): Promise<Result<Workspace, NotFoundError>> {
    const found = [...this.workspaces.values()].find((w) => w.slug === slug)
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Workspace', slug))
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return [...this.workspaces.values()].some((w) => w.slug === slug)
  }

  async save(workspace: Workspace): Promise<Result<void, DomainError>> {
    this.workspaces.set(workspace.workspaceId.toString(), workspace)
    return Result.ok(undefined)
  }

  async delete(id: WorkspaceId): Promise<Result<void, DomainError>> {
    this.workspaces.delete(id.toString())
    return Result.ok(undefined)
  }
}

export class InMemoryUserRepository implements IUserRepository {
  readonly users = new Map<string, User>()

  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const user = this.users.get(id)
    return user ? Result.ok(user) : Result.fail(new NotFoundError('User', id))
  }

  async findByEmail(email: string): Promise<Result<User, NotFoundError>> {
    const user = [...this.users.values()].find((u) => u.email === email)
    return user ? Result.ok(user) : Result.fail(new NotFoundError('User', email))
  }

  async save(user: User): Promise<Result<void, never>> {
    this.users.set(user.id, user)
    return Result.ok(undefined)
  }
}

export class InMemoryWorkspaceUserRepository implements IWorkspaceUserRepository {
  readonly memberships: WorkspaceUser[] = []

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
  readonly records = new Map<string, RefreshTokenRecord>()

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
    // Conditional revoke (mirrors apps/api InMemoryRefreshTokenRepository):
    // already-revoked tokens fail, closing the concurrent-rotation reuse window.
    if (!record || record.revokedAt !== null) {
      return Result.fail(new NotFoundError('RefreshToken', id))
    }
    this.records.set(id, { ...record, revokedAt: new Date() })
    return Result.ok(undefined)
  }
}

export class InMemoryInvitationRepository implements IInvitationRepository {
  readonly records = new Map<string, InvitationRecord>()

  async findByTokenHash(tokenHash: string): Promise<Result<InvitationRecord, NotFoundError>> {
    const found = [...this.records.values()].find((r) => r.tokenHash === tokenHash)
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Invitation', tokenHash))
  }

  async save(record: InvitationRecord): Promise<Result<void, never>> {
    this.records.set(record.id, record)
    return Result.ok(undefined)
  }
}

export class NoopEventBus implements IEventBus {
  readonly published: unknown[] = []

  async publish(events: unknown[]): Promise<void> {
    this.published.push(...events)
  }

  subscribe(): void {}
}
