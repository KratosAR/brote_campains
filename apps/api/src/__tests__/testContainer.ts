import { AwilixContainer } from 'awilix'
import { Result, NotFoundError, DomainError, Workspace, WorkspaceId } from '@bcp/domain'
import { IUserRepository, User, IWorkspaceRepository, IEventBus } from '@bcp/contracts'

import { Cradle } from '../container'
import {
  InMemoryWorkspaceUserRepository,
  InMemoryRefreshTokenRepository,
  InMemoryInvitationRepository,
} from '../repositories/InMemoryRepositories'

class InMemoryUserRepository implements IUserRepository {
  readonly users = new Map<string, User>()

  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const user = this.users.get(id)
    return user ? Result.ok(user) : Result.fail(new NotFoundError('User', id))
  }

  async findByEmail(email: string): Promise<Result<User, NotFoundError>> {
    const user = [...this.users.values()].find((u) => u.email === email)
    return user ? Result.ok(user) : Result.fail(new NotFoundError('User', email))
  }

  async save(user: User): Promise<Result<void, DomainError>> {
    this.users.set(user.id, user)
    return Result.ok(undefined)
  }
}

class InMemoryWorkspaceRepository implements IWorkspaceRepository {
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

class NoopEventBus implements IEventBus {
  async publish(): Promise<void> {}
  subscribe(): void {}
}

/** In-memory Cradle for HTTP integration tests — no Redis/Postgres required. */
export function createTestContainer(): AwilixContainer<Cradle> {
  const cradle: Cradle = {
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    cache: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
    } as unknown as Cradle['cache'],
    eventBus: new NoopEventBus(),
    queue: { add: async () => {} } as unknown as Cradle['queue'],
    secretManager: { getSecret: async () => '' } as unknown as Cradle['secretManager'],
    workspaceRepository: new InMemoryWorkspaceRepository(),
    userRepository: new InMemoryUserRepository(),
    workspaceUserRepository: new InMemoryWorkspaceUserRepository(),
    refreshTokenRepository: new InMemoryRefreshTokenRepository(),
    invitationRepository: new InMemoryInvitationRepository(),
  }

  return { resolve: (key: keyof Cradle) => cradle[key] } as unknown as AwilixContainer<Cradle>
}
