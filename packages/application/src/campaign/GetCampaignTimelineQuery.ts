import { CampaignId, CampaignTimelineEntry, Result, NotFoundError } from '@bcp/domain'
import { ICampaignRepository } from '@bcp/contracts'

export interface GetCampaignTimelineInput {
  campaignId: string
  workspaceId: string
}

export class GetCampaignTimelineQuery {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  async execute(input: GetCampaignTimelineInput): Promise<Result<CampaignTimelineEntry[], NotFoundError>> {
    const found = await this.campaignRepository.findById(CampaignId.from(input.campaignId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    return Result.ok(found.getValue().timeline)
  }
}
