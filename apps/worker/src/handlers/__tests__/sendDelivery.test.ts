import { Campaign, CampaignAudience, ChannelType, Delivery, DeliveryStatus, DeliveryPolicy } from '@bcp/domain'
import { ProviderError } from '@bcp/contracts'
import { InMemoryCampaignRepository, InMemoryDeliveryRepository, FakeQueue, ScriptedProvider } from './testDoubles'
import { sendDeliveryHandler } from '../sendDelivery'

const WORKSPACE_ID = 'ws-1'

function makeCampaign(deliveryPolicy?: DeliveryPolicy): Campaign {
  const audience = CampaignAudience.create({ type: 'all' }).getValue()
  return Campaign.createDraft(
    WORKSPACE_ID,
    'Campaign',
    ChannelType.Email,
    audience,
    'template-1',
    undefined,
    deliveryPolicy,
  ).getValue()
}

function makeDelivery(campaign: Campaign): Delivery {
  return Delivery.create(
    campaign.campaignId.toString(),
    WORKSPACE_ID,
    'contact-1',
    ChannelType.Email,
    'ana@example.com',
    'Hola Ana',
  ).getValue()
}

describe('sendDeliveryHandler', () => {
  it('camino feliz: marca Sent y encola update-statistics con sent:1', async () => {
    const campaign = makeCampaign()
    const delivery = makeDelivery(campaign)
    const campaignRepository = new InMemoryCampaignRepository()
    const deliveryRepository = new InMemoryDeliveryRepository()
    await campaignRepository.save(campaign)
    await deliveryRepository.save(delivery)
    const queue = new FakeQueue()
    const provider = new ScriptedProvider([
      async () => ({ providerMessageId: 'pm-1', timestamp: new Date() }),
    ])

    await sendDeliveryHandler(
      { deliveryId: delivery.deliveryId.toString(), workspaceId: WORKSPACE_ID, campaignId: campaign.campaignId.toString() },
      { deliveryRepository, campaignRepository, provider, queue },
    )

    const saved = (await deliveryRepository.findById(delivery.deliveryId, WORKSPACE_ID)).getValue()
    expect(saved.status).toBe(DeliveryStatus.Sent)
    expect(queue.jobs).toHaveLength(1)
    expect(queue.jobs[0]).toMatchObject({ jobName: 'update-statistics', data: { delta: { sent: 1 } } })
  })

  it('error temporal con reintento disponible: encola retry-delivery, no marca Failed final', async () => {
    const campaign = makeCampaign(DeliveryPolicy.create({ maxRetries: 3, retryDelays: [60000, 300000] }))
    const delivery = makeDelivery(campaign)
    const campaignRepository = new InMemoryCampaignRepository()
    const deliveryRepository = new InMemoryDeliveryRepository()
    await campaignRepository.save(campaign)
    await deliveryRepository.save(delivery)
    const queue = new FakeQueue()
    const provider = new ScriptedProvider([
      async () => {
        throw new ProviderError('TemporaryError', 'rate limited')
      },
    ])

    await sendDeliveryHandler(
      { deliveryId: delivery.deliveryId.toString(), workspaceId: WORKSPACE_ID, campaignId: campaign.campaignId.toString() },
      { deliveryRepository, campaignRepository, provider, queue },
    )

    const saved = (await deliveryRepository.findById(delivery.deliveryId, WORKSPACE_ID)).getValue()
    expect(saved.status).toBe(DeliveryStatus.Failed)
    expect(saved.canRetry(3)).toBe(true)
    expect(queue.jobs).toHaveLength(1)
    expect(queue.jobs[0]).toMatchObject({ jobName: 'retry-delivery', options: { delay: 60000 } })
  })

  it('error temporal sin reintentos disponibles: marca Failed y encola update-statistics con failed:1', async () => {
    const campaign = makeCampaign(DeliveryPolicy.create({ maxRetries: 1, retryDelays: [] }))
    const delivery = makeDelivery(campaign)
    const campaignRepository = new InMemoryCampaignRepository()
    const deliveryRepository = new InMemoryDeliveryRepository()
    await campaignRepository.save(campaign)
    await deliveryRepository.save(delivery)
    const queue = new FakeQueue()
    const provider = new ScriptedProvider([
      async () => {
        throw new ProviderError('TemporaryError', 'rate limited')
      },
    ])

    await sendDeliveryHandler(
      { deliveryId: delivery.deliveryId.toString(), workspaceId: WORKSPACE_ID, campaignId: campaign.campaignId.toString() },
      { deliveryRepository, campaignRepository, provider, queue },
    )

    const saved = (await deliveryRepository.findById(delivery.deliveryId, WORKSPACE_ID)).getValue()
    expect(saved.status).toBe(DeliveryStatus.Failed)
    expect(queue.jobs).toHaveLength(1)
    expect(queue.jobs[0]).toMatchObject({ jobName: 'update-statistics', data: { delta: { failed: 1 } } })
  })

  it('error permanente: marca Failed sin reintentar aunque canRetry sea true', async () => {
    const campaign = makeCampaign(DeliveryPolicy.create({ maxRetries: 3, retryDelays: [60000] }))
    const delivery = makeDelivery(campaign)
    const campaignRepository = new InMemoryCampaignRepository()
    const deliveryRepository = new InMemoryDeliveryRepository()
    await campaignRepository.save(campaign)
    await deliveryRepository.save(delivery)
    const queue = new FakeQueue()
    const provider = new ScriptedProvider([
      async () => {
        throw new ProviderError('PermanentError', 'invalid number')
      },
    ])

    await sendDeliveryHandler(
      { deliveryId: delivery.deliveryId.toString(), workspaceId: WORKSPACE_ID, campaignId: campaign.campaignId.toString() },
      { deliveryRepository, campaignRepository, provider, queue },
    )

    const saved = (await deliveryRepository.findById(delivery.deliveryId, WORKSPACE_ID)).getValue()
    expect(saved.status).toBe(DeliveryStatus.Failed)
    expect(queue.jobs).toHaveLength(1)
    expect(queue.jobs[0]).toMatchObject({ jobName: 'update-statistics', data: { delta: { failed: 1 } } })
  })
})
