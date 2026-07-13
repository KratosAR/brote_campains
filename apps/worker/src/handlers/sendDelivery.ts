import { DeliveryId, CampaignId } from '@bcp/domain'
import { ICampaignRepository, IDeliveryRepository, IQueue, MessagingProvider } from '@bcp/contracts'
import { attemptSend } from './attemptSend'

export interface SendDeliveryJobData {
  deliveryId: string
  workspaceId: string
  campaignId: string
}

export interface SendDeliveryDeps {
  deliveryRepository: IDeliveryRepository
  campaignRepository: ICampaignRepository
  provider: MessagingProvider
  queue: IQueue
}

export async function sendDeliveryHandler(data: SendDeliveryJobData, deps: SendDeliveryDeps): Promise<void> {
  const { deliveryId, workspaceId, campaignId } = data
  const { deliveryRepository, campaignRepository, provider, queue } = deps

  const deliveryResult = await deliveryRepository.findById(DeliveryId.from(deliveryId), workspaceId)
  if (deliveryResult.isFail()) return
  const delivery = deliveryResult.getValue()

  const campaignResult = await campaignRepository.findById(CampaignId.from(campaignId), workspaceId)
  if (campaignResult.isFail()) return
  const campaign = campaignResult.getValue()

  await attemptSend(delivery, campaign, { deliveryRepository, provider, queue })
}
