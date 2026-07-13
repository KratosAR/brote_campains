import { CampaignId, Result, DomainError } from '@bcp/domain'
import { ICampaignRepository } from '@bcp/contracts'

export interface ResumeCampaignInput {
  campaignId: string
  workspaceId: string
  // ponytail: userId no persistido, Campaign no trackea createdBy todavía
  userId: string
}

export class ResumeCampaignCommand {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  async execute(input: ResumeCampaignInput): Promise<Result<void, DomainError>> {
    const found = await this.campaignRepository.findById(CampaignId.from(input.campaignId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const campaign = found.getValue()

    const result = campaign.resume()
    if (result.isFail()) return Result.fail(result.getError())

    const saveResult = await this.campaignRepository.save(campaign)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
