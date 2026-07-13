import type { PrismaClient, Prisma } from '@prisma/client'
import { Result, Contact, ContactId, NotFoundError } from '@bcp/domain'
import type {
  IContactRepository,
  ContactSearchFilters,
  Pagination,
  Page,
  CursorPaginationInput,
  CursorPaginationResult,
} from '@bcp/contracts'
import { CursorEncoder } from '@bcp/contracts'

import { ContactMapper } from './ContactMapper'

const include = { channels: true, tags: true } as const

export class PrismaContactRepository implements IContactRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: ContactId, workspaceId: string): Promise<Result<Contact, NotFoundError>> {
    const record = await this.prisma.contact.findFirst({
      where: { id: id.toString(), workspaceId },
      include,
    })
    if (!record) return Result.fail(new NotFoundError('Contact', id.toString()))
    return Result.ok(ContactMapper.toDomain(record))
  }

  async findByChannel(
    type: string,
    value: string,
    workspaceId: string,
  ): Promise<Result<Contact, NotFoundError>> {
    const channel = await this.prisma.contactChannel.findFirst({
      where: { workspaceId, type, value },
    })
    if (!channel) return Result.fail(new NotFoundError('Contact', value))
    return this.findById(ContactId.from(channel.contactId), workspaceId)
  }

  async findByExternalId(
    externalId: string,
    workspaceId: string,
  ): Promise<Result<Contact, NotFoundError>> {
    const record = await this.prisma.contact.findFirst({
      where: { externalId, workspaceId },
      include,
    })
    if (!record) return Result.fail(new NotFoundError('Contact', externalId))
    return Result.ok(ContactMapper.toDomain(record))
  }

  async search(
    workspaceId: string,
    filters: ContactSearchFilters,
    pagination: Pagination,
  ): Promise<Page<Contact>> {
    const where: Prisma.ContactWhereInput = { workspaceId }

    if (filters.q) {
      where.OR = [
        { firstName: { contains: filters.q, mode: 'insensitive' } },
        { lastName: { contains: filters.q, mode: 'insensitive' } },
        { company: { contains: filters.q, mode: 'insensitive' } },
      ]
    }
    if (filters.status) where.status = filters.status
    if (filters.acceptsCampaigns) where.acceptsCampaigns = filters.acceptsCampaigns
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { some: { tag: { in: filters.tags } } }
    }
    if (filters.groupId) {
      where.groups = { some: { groupId: filters.groupId } }
    }

    const skip = (pagination.page - 1) * pagination.limit

    const [records, total] = await Promise.all([
      this.prisma.contact.findMany({ where, include, skip, take: pagination.limit }),
      this.prisma.contact.count({ where }),
    ])

    return {
      items: records.map((r) => ContactMapper.toDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    }
  }

  async findByGroup(
    groupId: string,
    workspaceId: string,
    pagination: Pagination,
  ): Promise<Page<Contact>> {
    return this.search(workspaceId, { groupId }, pagination)
  }

  async searchCursor(
    workspaceId: string,
    filters: ContactSearchFilters,
    pagination: CursorPaginationInput,
  ): Promise<CursorPaginationResult<Contact>> {
    const where: Prisma.ContactWhereInput = { workspaceId }

    if (filters.q) {
      where.OR = [
        { firstName: { contains: filters.q, mode: 'insensitive' } },
        { lastName: { contains: filters.q, mode: 'insensitive' } },
        { company: { contains: filters.q, mode: 'insensitive' } },
      ]
    }
    if (filters.status) where.status = filters.status
    if (filters.acceptsCampaigns) where.acceptsCampaigns = filters.acceptsCampaigns
    if (filters.tags && filters.tags.length > 0) {
      where.tags = { some: { tag: { in: filters.tags } } }
    }
    if (filters.groupId) {
      where.groups = { some: { groupId: filters.groupId } }
    }

    const cursor = pagination.cursor ? CursorEncoder.decode(pagination.cursor) : undefined

    const records = await this.prisma.contact.findMany({
      where,
      include,
      take: pagination.limit + 1,
      cursor: cursor ? { id: cursor.id } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
    })

    const hasMore = records.length > pagination.limit
    const items = hasMore ? records.slice(0, -1) : records
    const nextCursor = hasMore ? CursorEncoder.encode(items[items.length - 1]!.id, new Date()) : undefined

    return {
      items: items.map((r) => ContactMapper.toDomain(r)),
      nextCursor,
      hasMore,
      limit: pagination.limit,
    }
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    return this.prisma.contact.count({ where: { workspaceId } })
  }

  async save(contact: Contact): Promise<Result<void, NotFoundError>> {
    const { contact: data, channels, tags } = ContactMapper.toPersistence(contact)

    await this.prisma.$transaction([
      this.prisma.contact.upsert({ where: { id: data.id }, create: data, update: data }),
      this.prisma.contactChannel.deleteMany({ where: { contactId: data.id } }),
      this.prisma.contactChannel.createMany({ data: channels }),
      this.prisma.contactTag.deleteMany({ where: { contactId: data.id } }),
      this.prisma.contactTag.createMany({ data: tags }),
    ])

    return Result.ok(undefined)
  }

  // ponytail: un solo $transaction por llamada, sin trocear en lotes más chicos (YAGNI hasta que el volumen lo pida).
  async saveBatch(contacts: Contact[]): Promise<void> {
    const operations = contacts.flatMap((contact) => {
      const { contact: data, channels, tags } = ContactMapper.toPersistence(contact)
      return [
        this.prisma.contact.upsert({ where: { id: data.id }, create: data, update: data }),
        this.prisma.contactChannel.deleteMany({ where: { contactId: data.id } }),
        this.prisma.contactChannel.createMany({ data: channels }),
        this.prisma.contactTag.deleteMany({ where: { contactId: data.id } }),
        this.prisma.contactTag.createMany({ data: tags }),
      ]
    })

    await this.prisma.$transaction(operations)
  }
}
