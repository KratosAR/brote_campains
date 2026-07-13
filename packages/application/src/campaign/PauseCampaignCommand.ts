import { CampaignId, Result, DomainError } from '@bcp/domain'
import { ICampaignRepository } from '@bcp/contracts'

export interface PauseCampaignInput {
  campaignId: string
  workspaceId: string
  reason?: string
  // ponytail: userId no persistido, Campaign no trackea createdBy todavía
  userId: string
}

export class PauseCampaignCommand {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  async execute(input: PauseCampaignInput): Promise<Result<void, DomainError>> {
    const found = await this.campaignRepository.findById(CampaignId.from(input.campaignId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const campaign = found.getValue()

    const result = campaign.pause(input.reason)
    if (result.isFail()) return Result.fail(result.getError())

    const saveResult = await this.campaignRepository.save(campaign)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
