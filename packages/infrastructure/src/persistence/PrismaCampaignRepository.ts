import type { PrismaClient } from '@prisma/client'
import { Result, Campaign, CampaignId, CampaignStatus, NotFoundError } from '@bcp/domain'
import type { ICampaignRepository, Pagination, Page } from '@bcp/contracts'

import { CampaignMapper } from './CampaignMapper'

export class PrismaCampaignRepository implements ICampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: CampaignId, workspaceId: string): Promise<Result<Campaign, NotFoundError>> {
    const record = await this.prisma.campaign.findFirst({ where: { id: id.toString(), workspaceId } })
    if (!record) return Result.fail(new NotFoundError('Campaign', id.toString()))
    return Result.ok(CampaignMapper.toDomain(record))
  }

  async findByStatus(
    workspaceId: string,
    statuses: CampaignStatus[],
    pagination: Pagination,
  ): Promise<Page<Campaign>> {
    const where = { workspaceId, status: { in: statuses } }
    const skip = (pagination.page - 1) * pagination.limit

    const [records, total] = await Promise.all([
      this.prisma.campaign.findMany({ where, skip, take: pagination.limit }),
      this.prisma.campaign.count({ where }),
    ])

    return {
      items: records.map((r) => CampaignMapper.toDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    }
  }

  async findScheduledBefore(date: Date): Promise<Campaign[]> {
    const records = await this.prisma.campaign.findMany({
      where: { status: CampaignStatus.Scheduled, scheduledAt: { lte: date } },
    })
    return records.map((r) => CampaignMapper.toDomain(r))
  }

  async findRunning(workspaceId: string): Promise<Campaign[]> {
    const records = await this.prisma.campaign.findMany({
      where: { workspaceId, status: CampaignStatus.Running },
    })
    return records.map((r) => CampaignMapper.toDomain(r))
  }

  async save(campaign: Campaign): Promise<Result<void, NotFoundError>> {
    const data = CampaignMapper.toPersistence(campaign)
    await this.prisma.campaign.upsert({ where: { id: data.id }, create: data, update: data })
    return Result.ok(undefined)
  }
}
