import type { PrismaClient } from '@prisma/client'
import { Result, Delivery, DeliveryId, DeliveryStatus, NotFoundError } from '@bcp/domain'
import type { IDeliveryRepository, Pagination, Page, CursorPaginationInput, CursorPaginationResult } from '@bcp/contracts'
import { CursorEncoder } from '@bcp/contracts'

import { DeliveryMapper } from './DeliveryMapper'

export class PrismaDeliveryRepository implements IDeliveryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: DeliveryId, workspaceId: string): Promise<Result<Delivery, NotFoundError>> {
    const record = await this.prisma.delivery.findFirst({ where: { id: id.toString(), workspaceId } })
    if (!record) return Result.fail(new NotFoundError('Delivery', id.toString()))
    return Result.ok(DeliveryMapper.toDomain(record))
  }

  async findByProviderMessageId(providerMessageId: string): Promise<Delivery | null> {
    const record = await this.prisma.delivery.findFirst({ where: { providerMessageId } })
    return record ? DeliveryMapper.toDomain(record) : null
  }

  async findByCampaign(
    campaignId: string,
    workspaceId: string,
    status: DeliveryStatus | undefined,
    pagination: Pagination,
  ): Promise<Page<Delivery>> {
    const where = { campaignId, workspaceId, ...(status ? { status } : {}) }
    const skip = (pagination.page - 1) * pagination.limit

    const [records, total] = await Promise.all([
      this.prisma.delivery.findMany({ where, skip, take: pagination.limit }),
      this.prisma.delivery.count({ where }),
    ])

    return {
      items: records.map((r) => DeliveryMapper.toDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    }
  }

  async findByCampaignCursor(
    campaignId: string,
    workspaceId: string,
    status: DeliveryStatus | undefined,
    pagination: CursorPaginationInput,
  ): Promise<CursorPaginationResult<Delivery>> {
    const where = { campaignId, workspaceId, ...(status ? { status } : {}) }
    const cursor = pagination.cursor ? CursorEncoder.decode(pagination.cursor) : undefined

    const records = await this.prisma.delivery.findMany({
      where,
      take: pagination.limit + 1,
      cursor: cursor ? { id: cursor.id } : undefined,
      skip: cursor ? 1 : 0,
      orderBy: { id: 'asc' },
    })

    const hasMore = records.length > pagination.limit
    const items = hasMore ? records.slice(0, -1) : records
    const nextCursor = hasMore ? CursorEncoder.encode(items[items.length - 1]!.id, new Date()) : undefined

    return {
      items: items.map((r) => DeliveryMapper.toDomain(r)),
      nextCursor,
      hasMore,
      limit: pagination.limit,
    }
  }

  async countByCampaignAndStatus(campaignId: string, workspaceId: string): Promise<Record<string, number>> {
    const groups = await this.prisma.delivery.groupBy({
      by: ['status'],
      where: { campaignId, workspaceId },
      _count: { status: true },
    })

    return groups.reduce<Record<string, number>>((acc, g) => {
      acc[g.status] = g._count.status
      return acc
    }, {})
  }

  async save(delivery: Delivery): Promise<Result<void, NotFoundError>> {
    const data = DeliveryMapper.toPersistence(delivery)
    await this.prisma.delivery.upsert({ where: { id: data.id }, create: data, update: data })
    return Result.ok(undefined)
  }

  async saveBatch(deliveries: Delivery[]): Promise<void> {
    await this.prisma.$transaction(
      deliveries.map((delivery) => {
        const data = DeliveryMapper.toPersistence(delivery)
        return this.prisma.delivery.upsert({ where: { id: data.id }, create: data, update: data })
      }),
    )
  }
}
