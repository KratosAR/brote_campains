import { Delivery, DeliveryStatus, ChannelType } from '@bcp/domain'
import { InMemoryDeliveryRepository, FakeQueue } from './testDoubles'
import { processWebhookHandler } from '../processWebhook'

const WORKSPACE_ID = 'ws-1'

function makeDelivery(): Delivery {
  return Delivery.create('campaign-1', WORKSPACE_ID, 'contact-1', ChannelType.Email, 'ana@example.com', 'Hola').getValue()
}

async function toSent(delivery: Delivery): Promise<void> {
  delivery.markQueued()
  delivery.markSending(1)
  delivery.markSent('wamid-1')
}

const logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }

describe('processWebhookHandler', () => {
  it('status delivered: marca Delivered y encola update-statistics', async () => {
    const delivery = makeDelivery()
    await toSent(delivery)
    const deliveryRepository = new InMemoryDeliveryRepository()
    await deliveryRepository.save(delivery)
    const queue = new FakeQueue()

    await processWebhookHandler(
      { provider: 'meta', payload: { entry: [{ changes: [{ value: { statuses: [{ id: 'wamid-1', status: 'delivered' }] } }] }] } },
      { deliveryRepository, queue, logger },
    )

    const saved = (await deliveryRepository.findById(delivery.deliveryId, WORKSPACE_ID)).getValue()
    expect(saved.status).toBe(DeliveryStatus.Delivered)
    expect(queue.jobs).toHaveLength(1)
    expect(queue.jobs[0]).toMatchObject({ jobName: 'update-statistics', data: { delta: { delivered: 1 } } })
  })

  it('delivery no encontrado: no explota y no encola nada', async () => {
    const deliveryRepository = new InMemoryDeliveryRepository()
    const queue = new FakeQueue()

    await processWebhookHandler(
      { provider: 'meta', payload: { entry: [{ changes: [{ value: { statuses: [{ id: 'unknown-id', status: 'delivered' }] } }] }] } },
      { deliveryRepository, queue, logger },
    )

    expect(queue.jobs).toHaveLength(0)
  })

  it('payload no normalizable: no explota', async () => {
    const deliveryRepository = new InMemoryDeliveryRepository()
    const queue = new FakeQueue()

    await processWebhookHandler({ provider: 'evolution', payload: { garbage: true } }, { deliveryRepository, queue, logger })

    expect(queue.jobs).toHaveLength(0)
  })

  it('transición inválida (ya estaba Read): no explota ni re-encola', async () => {
    const delivery = makeDelivery()
    await toSent(delivery)
    delivery.markDelivered()
    delivery.markRead()
    const deliveryRepository = new InMemoryDeliveryRepository()
    await deliveryRepository.save(delivery)
    const queue = new FakeQueue()

    await processWebhookHandler(
      {
        provider: 'evolution',
        payload: { event: 'messages.update', data: { key: { id: 'wamid-1' }, update: { status: 'delivered' } } },
      },
      { deliveryRepository, queue, logger },
    )

    expect(queue.jobs).toHaveLength(0)
  })
})
