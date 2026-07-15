import {
  Campaign,
  CampaignAudience,
  CampaignAudienceType,
  CampaignSchedule,
  DeliveryPolicy,
  ChannelType,
  Result,
  DomainError,
} from '@bcp/domain'
import { ICampaignRepository, IEventBus, IQueue } from '@bcp/contracts'

export interface CreateCampaignInput {
  workspaceId: string
  name: string
  channel: ChannelType
  audienceType: CampaignAudienceType
  audienceGroupIds?: string[]
  audienceContactIds?: string[]
  templateId: string
  scheduledAt?: Date
  timezone?: string
  sendNow?: boolean
  deliveryPolicy?: { maxRetries: number; retryDelays: number[] }
  // ponytail: userId no persistido, Campaign no trackea createdBy todavía
  userId: string
}

export interface CreateCampaignOutput {
  campaignId: string
}

export class CreateCampaignCommand {
  constructor(
    private readonly campaignRepository: ICampaignRepository,
    private readonly eventBus?: IEventBus,
    private readonly queue?: IQueue,
  ) {}

  async execute(input: CreateCampaignInput): Promise<Result<CreateCampaignOutput, DomainError>> {
    const audienceResult = CampaignAudience.create({
      type: input.audienceType,
      groupIds: input.audienceGroupIds,
      contactIds: input.audienceContactIds,
    })
    if (audienceResult.isFail()) return Result.fail(audienceResult.getError())

    let schedule: CampaignSchedule | undefined
    if (input.scheduledAt || input.sendNow) {
      const scheduleResult = CampaignSchedule.create({
        sendAt: input.scheduledAt ?? new Date(),
        timezone: input.timezone ?? 'UTC',
        sendNow: input.sendNow ?? false,
      })
      if (scheduleResult.isFail()) return Result.fail(scheduleResult.getError())
      schedule = scheduleResult.getValue()
    }

    const deliveryPolicy = input.deliveryPolicy ? DeliveryPolicy.create(input.deliveryPolicy) : undefined

    const campaignResult = Campaign.createDraft(
      input.workspaceId,
      input.name,
      input.channel,
      audienceResult.getValue(),
      input.templateId,
      schedule,
      deliveryPolicy,
    )
    if (campaignResult.isFail()) return Result.fail(campaignResult.getError())
    const campaign = campaignResult.getValue()

    // ponytail: If sendNow is true, immediately schedule + start the campaign.
    // A plain `scheduledAt` (no sendNow) only attaches schedule metadata — it
    // stays in Draft until explicitly scheduled via PATCH /campaigns/:id/schedule.
    if (input.sendNow && schedule) {
      const scheduleTransition = campaign.schedule(schedule)
      if (scheduleTransition.isFail()) return Result.fail(scheduleTransition.getError())

      const startResult = campaign.start()
      if (startResult.isFail()) return Result.fail(startResult.getError())
    }

    const saveResult = await this.campaignRepository.save(campaign)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    // Publish domain events (audit/analytics subscribers, if any)
    if (this.eventBus) {
      await this.eventBus.publish(campaign.clearDomainEvents())
    }

    // Started campaigns don't go through the scheduler poll (that only picks up
    // "Scheduled" campaigns) — enqueue the job that actually resolves the
    // audience and creates deliveries, otherwise the campaign is stuck
    // "Running" with zero deliveries forever.
    if (input.sendNow && this.queue) {
      await this.queue.add('start-campaign', {
        campaignId: campaign.campaignId.toString(),
        workspaceId: input.workspaceId,
      })
    }

    return Result.ok({ campaignId: campaign.campaignId.toString() })
  }
}
