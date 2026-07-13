import { CampaignId, CampaignSchedule, Result, DomainError } from '@bcp/domain'
import { ICampaignRepository } from '@bcp/contracts'

export interface ScheduleCampaignInput {
  campaignId: string
  workspaceId: string
  scheduledAt: Date
  timezone: string
  // ponytail: userId no persistido, Campaign no trackea createdBy todavía
  userId: string
}

export class ScheduleCampaignCommand {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  async execute(input: ScheduleCampaignInput): Promise<Result<void, DomainError>> {
    const found = await this.campaignRepository.findById(CampaignId.from(input.campaignId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const campaign = found.getValue()

    const scheduleResult = CampaignSchedule.create({
      sendAt: input.scheduledAt,
      timezone: input.timezone,
      sendNow: false,
    })
    if (scheduleResult.isFail()) return Result.fail(scheduleResult.getError())

    const result = campaign.schedule(scheduleResult.getValue())
    if (result.isFail()) return Result.fail(result.getError())

    const saveResult = await this.campaignRepository.save(campaign)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
