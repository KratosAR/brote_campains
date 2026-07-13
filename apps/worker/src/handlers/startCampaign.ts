import { CampaignId, TemplateId } from '@bcp/domain'
import { ICampaignRepository, IContactRepository, IGroupRepository, ITemplateRepository, IDeliveryRepository, IEventBus, IQueue } from '@bcp/contracts'
import { resolveAudience, generateDeliveries, planBatches } from '@bcp/application'

// ponytail: rate fijo, sin capabilities() de provider todavía (eso es Sprint 7)
const RATE_PER_MINUTE = 60

export interface StartCampaignJobData {
  campaignId: string
  workspaceId: string
}

export interface StartCampaignDeps {
  campaignRepository: ICampaignRepository
  contactRepository: IContactRepository
  groupRepository: IGroupRepository
  templateRepository: ITemplateRepository
  deliveryRepository: IDeliveryRepository
  eventBus: IEventBus
  queue: IQueue
}

export async function startCampaignHandler(data: StartCampaignJobData, deps: StartCampaignDeps): Promise<void> {
  const { campaignId, workspaceId } = data
  const {
    campaignRepository,
    contactRepository,
    groupRepository,
    templateRepository,
    deliveryRepository,
    eventBus,
    queue,
  } = deps

  const campaignResult = await campaignRepository.findById(CampaignId.from(campaignId), workspaceId)
  if (campaignResult.isFail()) return
  const campaign = campaignResult.getValue()

  const templateResult = await templateRepository.findById(TemplateId.from(campaign.templateId), workspaceId)
  if (templateResult.isFail()) return
  const template = templateResult.getValue()

  const resolvedContacts = await resolveAudience(campaign, workspaceId, contactRepository, groupRepository)
  const deliveries = await generateDeliveries(campaign, resolvedContacts, template, deliveryRepository, eventBus)

  const batches = planBatches(
    deliveries.map((d) => d.deliveryId.toString()),
    RATE_PER_MINUTE,
  )

  const now = Date.now()
  for (const batch of batches) {
    const delay = Math.max(0, batch.scheduledAfter.getTime() - now)
    for (const deliveryId of batch.deliveryIds) {
      await queue.add('send-delivery', { deliveryId, workspaceId, campaignId }, { delay })
    }
  }
}
