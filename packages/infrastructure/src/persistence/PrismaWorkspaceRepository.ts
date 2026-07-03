import type { PrismaClient } from '@prisma/client'
import { Result, Workspace, WorkspaceId, NotFoundError, DomainError } from '@bcp/domain'
import type { IWorkspaceRepository } from '@bcp/contracts'

import { WorkspaceMapper } from './WorkspaceMapper'

export class PrismaWorkspaceRepository implements IWorkspaceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: WorkspaceId): Promise<Result<Workspace, NotFoundError>> {
    const record = await this.prisma.workspace.findUnique({ where: { id: id.toString() } })
    if (!record) return Result.fail(new NotFoundError('Workspace', id.toString()))
    return Result.ok(WorkspaceMapper.toDomain(record))
  }

  async findBySlug(slug: string): Promise<Result<Workspace, NotFoundError>> {
    const record = await this.prisma.workspace.findUnique({ where: { slug } })
    if (!record) return Result.fail(new NotFoundError('Workspace', slug))
    return Result.ok(WorkspaceMapper.toDomain(record))
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const count = await this.prisma.workspace.count({ where: { slug } })
    return count > 0
  }

  async save(workspace: Workspace): Promise<Result<void, DomainError>> {
    const data = WorkspaceMapper.toPersistence(workspace)
    await this.prisma.workspace.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    })
    return Result.ok(undefined)
  }

  async delete(id: WorkspaceId): Promise<Result<void, DomainError>> {
    await this.prisma.workspace.delete({ where: { id: id.toString() } })
    return Result.ok(undefined)
  }
}
