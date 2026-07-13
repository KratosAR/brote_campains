import { Campaign, CampaignId, Result, NotFoundError } from '@bcp/domain'
import { ICampaignRepository } from '@bcp/contracts'

export interface GetCampaignInput {
  campaignId: string
  workspaceId: string
}

export class GetCampaignQuery {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  async execute(input: GetCampaignInput): Promise<Result<Campaign, NotFoundError>> {
    return this.campaignRepository.findById(CampaignId.from(input.campaignId), input.workspaceId)
  }
}
