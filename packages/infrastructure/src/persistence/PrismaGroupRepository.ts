import type { PrismaClient } from '@prisma/client'
import { Result, ContactGroup, GroupId, NotFoundError } from '@bcp/domain'
import type { IGroupRepository } from '@bcp/contracts'

import { GroupMapper } from './GroupMapper'

const withCount = { include: { _count: { select: { members: true } } } } as const

export class PrismaGroupRepository implements IGroupRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: GroupId, workspaceId: string): Promise<Result<ContactGroup, NotFoundError>> {
    const record = await this.prisma.group.findFirst({
      where: { id: id.toString(), workspaceId },
      ...withCount,
    })
    if (!record) return Result.fail(new NotFoundError('Group', id.toString()))
    return Result.ok(GroupMapper.toDomain({ ...record, contactCount: record._count.members }))
  }

  async findByWorkspace(workspaceId: string): Promise<ContactGroup[]> {
    const records = await this.prisma.group.findMany({ where: { workspaceId }, ...withCount })
    return records.map((r) => GroupMapper.toDomain({ ...r, contactCount: r._count.members }))
  }

  async save(group: ContactGroup): Promise<Result<void, NotFoundError>> {
    const data = GroupMapper.toPersistence(group)
    await this.prisma.group.upsert({ where: { id: data.id }, create: data, update: data })
    return Result.ok(undefined)
  }

  async addContact(groupId: string, contactId: string, workspaceId: string): Promise<void> {
    await this.prisma.contactGroupMembership.upsert({
      where: { contactId_groupId: { contactId, groupId } },
      create: { contactId, groupId, workspaceId },
      update: {},
    })
  }

  async removeContact(groupId: string, contactId: string, workspaceId: string): Promise<void> {
    // ponytail: workspaceId no se usa en el where compuesto porque la PK ya identifica el registro sin ambigüedad.
    await this.prisma.contactGroupMembership.deleteMany({ where: { contactId, groupId, workspaceId } })
  }
}
