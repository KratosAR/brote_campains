import { Delivery, Campaign, DeliveryStatus } from '@bcp/domain'
import { IDeliveryRepository, IQueue, MessagingProvider, ProviderError } from '@bcp/contracts'

export interface AttemptSendDeps {
  deliveryRepository: IDeliveryRepository
  provider: MessagingProvider
  queue: IQueue
}

const NO_RETRY_KINDS = ['PermanentError', 'AuthError']

// ponytail: usado por send-delivery y retry-delivery — mismo flujo, la única diferencia es
// el attemptNumber que ya viene incorporado en delivery.attempts.length.
// Los Result de markQueued/markSending se ignoran: el guard de status previo a cada llamada
// ya garantiza la transición válida.
export async function attemptSend(delivery: Delivery, campaign: Campaign, deps: AttemptSendDeps): Promise<void> {
  const { deliveryRepository, provider, queue } = deps

  if (delivery.status === DeliveryStatus.Pending) {
    delivery.markQueued()
  }

  const attemptNumber = delivery.attempts.length + 1
  delivery.markSending(attemptNumber)

  try {
    const response = await provider.send({ to: delivery.address, body: delivery.messageSnapshot })
    delivery.markSent(response.providerMessageId)
    await deliveryRepository.save(delivery)
    await queue.add('update-statistics', {
      campaignId: campaign.campaignId.toString(),
      workspaceId: campaign.workspaceId,
      delta: { sent: 1 },
    })
    return
  } catch (error: unknown) {
    const providerError =
      error instanceof ProviderError ? error : new ProviderError('TemporaryError', String(error))

    delivery.markFailed({ errorCode: providerError.kind, errorMessage: providerError.message })

    const canRetry =
      !NO_RETRY_KINDS.includes(providerError.kind) && delivery.canRetry(campaign.deliveryPolicy.maxRetries)

    if (canRetry) {
      await deliveryRepository.save(delivery)
      const delay = campaign.deliveryPolicy.retryDelays[attemptNumber - 1] ?? 60000
      await queue.add(
        'retry-delivery',
        {
          deliveryId: delivery.deliveryId.toString(),
          workspaceId: delivery.workspaceId,
          campaignId: campaign.campaignId.toString(),
        },
        { delay },
      )
      return
    }

    await deliveryRepository.save(delivery)
    await queue.add('update-statistics', {
      campaignId: campaign.campaignId.toString(),
      workspaceId: campaign.workspaceId,
      delta: { failed: 1 },
    })
  }
}
