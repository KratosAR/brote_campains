import type { PrismaClient } from '@prisma/client'
import { Result, Delivery, DeliveryId, DeliveryStatus, NotFoundError } from '@bcp/domain'
import type { IDeliveryRepository, Pagination, Page } from '@bcp/contracts'

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
