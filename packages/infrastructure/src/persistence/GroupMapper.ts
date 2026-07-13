import type { Group as PrismaGroup } from '@prisma/client'
import { ContactGroup, GroupId } from '@bcp/domain'

export type GroupRecord = PrismaGroup & { contactCount: number }

export const GroupMapper = {
  toDomain(record: GroupRecord): ContactGroup {
    return ContactGroup.hydrate(
      {
        workspaceId: record.workspaceId,
        name: record.name,
        description: record.description ?? undefined,
        contactCount: record.contactCount,
      },
      GroupId.from(record.id),
      record.createdAt,
      record.updatedAt,
    )
  },

  toPersistence(group: ContactGroup): Omit<PrismaGroup, 'createdAt' | 'updatedAt'> & {
    createdAt: Date
    updatedAt: Date
  } {
    return {
      id: group.groupId.toString(),
      workspaceId: group.workspaceId,
      name: group.name,
      description: group.description ?? null,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    }
  },
}
