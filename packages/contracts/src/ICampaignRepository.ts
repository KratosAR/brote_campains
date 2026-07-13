import { Result, Campaign, CampaignId, CampaignStatus, NotFoundError } from '@bcp/domain'
import { Pagination, Page } from './IContactRepository'

export interface ICampaignRepository {
  findById(id: CampaignId, workspaceId: string): Promise<Result<Campaign, NotFoundError>>
  findByStatus(
    workspaceId: string,
    statuses: CampaignStatus[],
    pagination: Pagination,
  ): Promise<Page<Campaign>>
  findScheduledBefore(date: Date): Promise<Campaign[]>
  findRunning(workspaceId: string): Promise<Campaign[]>
  save(campaign: Campaign): Promise<Result<void, NotFoundError>>
}
