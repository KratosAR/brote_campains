import { Result, NotFoundError, Campaign, CampaignId, CampaignStatus } from '@bcp/domain'
import { ICampaignRepository, Pagination, Page } from '@bcp/contracts'

export class InMemoryCampaignRepository implements ICampaignRepository {
  readonly campaigns = new Map<string, Campaign>()

  async findById(id: CampaignId, workspaceId: string): Promise<Result<Campaign, NotFoundError>> {
    const found = this.campaigns.get(id.toString())
    if (!found || found.workspaceId !== workspaceId) {
      return Result.fail(new NotFoundError('Campaign', id.toString()))
    }
    return Result.ok(found)
  }

  async findByStatus(
    workspaceId: string,
    statuses: CampaignStatus[],
    pagination: Pagination,
  ): Promise<Page<Campaign>> {
    const items = [...this.campaigns.values()].filter(
      (c) => c.workspaceId === workspaceId && statuses.includes(c.status),
    )
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async findScheduledBefore(date: Date): Promise<Campaign[]> {
    return [...this.campaigns.values()].filter(
      (c) => c.status === CampaignStatus.Scheduled && c.scheduleInfo && c.scheduleInfo.sendAt.getTime() < date.getTime(),
    )
  }

  async findRunning(workspaceId: string): Promise<Campaign[]> {
    return [...this.campaigns.values()].filter((c) => c.workspaceId === workspaceId && c.status === CampaignStatus.Running)
  }

  async save(campaign: Campaign): Promise<Result<void, NotFoundError>> {
    this.campaigns.set(campaign.campaignId.toString(), campaign)
    return Result.ok(undefined)
  }
}
