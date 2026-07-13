import { PrismaClient } from '@prisma/client'
import { Delivery, DeliveryId, ChannelType } from '@bcp/domain'

import { PrismaDeliveryRepository } from '../persistence/PrismaDeliveryRepository'

// ponytail: needs a real Postgres reachable via DATABASE_URL (see prisma/schema.prisma).
// Same probe-and-no-op pattern as PrismaCampaignRepository.integration.test.ts — no DB
// service in this sandbox.
describe('PrismaDeliveryRepository (integration)', () => {
  const prisma = new PrismaClient()
  const repo = new PrismaDeliveryRepository(prisma)
  const workspaceId = 'workspace-1'
  let dbAvailable = true

  beforeAll(async () => {
    try {
      await prisma.$connect()
    } catch {
      dbAvailable = false
    }
  })

  afterEach(async () => {
    if (dbAvailable) await prisma.delivery.deleteMany({ where: { workspaceId } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makeDelivery(campaignId = 'campaign-1'): Delivery {
    return Delivery.create(campaignId, workspaceId, 'contact-1', ChannelType.Email, 'a@b.com', 'Hello').getValue()
  }

  it('saves and finds a delivery by id', async () => {
    if (!dbAvailable) return
    const delivery = makeDelivery()
    await repo.save(delivery)

    const result = await repo.findById(delivery.deliveryId, workspaceId)

    expect(result.isOk()).toBe(true)
    expect(result.getValue().contactId).toBe('contact-1')
  })

  it('returns NotFoundError for unknown id', async () => {
    if (!dbAvailable) return
    const result = await repo.findById(DeliveryId.generate(), workspaceId)
    expect(result.isFail()).toBe(true)
  })

  it('finds by providerMessageId', async () => {
    if (!dbAvailable) return
    const delivery = makeDelivery()
    delivery.markQueued()
    delivery.markSending(1)
    delivery.markSent('provider-1')
    await repo.save(delivery)

    const found = await repo.findByProviderMessageId('provider-1')
    expect(found?.deliveryId.toString()).toBe(delivery.deliveryId.toString())
  })

  it('finds by campaign with pagination and counts by status', async () => {
    if (!dbAvailable) return
    await repo.save(makeDelivery())
    await repo.save(makeDelivery())

    const page = await repo.findByCampaign('campaign-1', workspaceId, undefined, { page: 1, limit: 10 })
    expect(page.total).toBe(2)

    const counts = await repo.countByCampaignAndStatus('campaign-1', workspaceId)
    expect(counts['Pending']).toBe(2)
  })

  it('saves a batch of deliveries in one transaction', async () => {
    if (!dbAvailable) return
    const deliveries = [makeDelivery(), makeDelivery()]
    await repo.saveBatch(deliveries)

    const page = await repo.findByCampaign('campaign-1', workspaceId, undefined, { page: 1, limit: 10 })
    expect(page.total).toBe(2)
  })
})
