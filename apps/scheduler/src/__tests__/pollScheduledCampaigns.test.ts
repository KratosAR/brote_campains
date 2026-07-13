import { PrismaClient } from '@prisma/client'
import { Campaign, CampaignAudience, CampaignSchedule, ChannelType } from '@bcp/domain'
import { CampaignMapper } from '@bcp/infrastructure'

import { pollScheduledCampaigns } from '../pollScheduledCampaigns'

// ponytail: necesita Postgres real (FOR UPDATE SKIP LOCKED no es mockeable de forma
// significativa). Mismo patrón probe-and-no-op que PrismaCampaignRepository.integration.test.ts.
describe('pollScheduledCampaigns (integration)', () => {
  const prisma = new PrismaClient()
  const workspaceId = 'workspace-1'
  let dbAvailable = true

  const fakeQueue = { add: jest.fn(async () => undefined) }

  beforeAll(async () => {
    try {
      await prisma.$connect()
    } catch {
      dbAvailable = false
    }
  })

  afterEach(async () => {
    fakeQueue.add.mockClear()
    if (dbAvailable) await prisma.campaign.deleteMany({ where: { workspaceId } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('picks up due scheduled campaigns, marks them Running, and enqueues start-campaign', async () => {
    if (!dbAvailable) return

    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft(workspaceId, 'Due Campaign', ChannelType.Email, audience, 'template-1').getValue()
    const schedule = CampaignSchedule.create({
      sendAt: new Date(Date.now() + 60_000),
      timezone: 'America/Argentina/Cordoba',
      sendNow: false,
    }).getValue()
    campaign.schedule(schedule)
    await prisma.campaign.create({ data: CampaignMapper.toPersistence(campaign) })
    // ponytail: el dominio no permite crear un schedule en el pasado; forzamos la fecha
    // "vencida" directo en la fila para simular una campaña ya lista para disparar.
    await prisma.campaign.update({
      where: { id: campaign.campaignId.toString() },
      data: { scheduledAt: new Date(Date.now() - 60_000) },
    })

    const processed = await pollScheduledCampaigns(prisma, fakeQueue)

    expect(processed).toBe(1)
    expect(fakeQueue.add).toHaveBeenCalledWith('start-campaign', { campaignId: campaign.campaignId.toString() })

    const updated = await prisma.campaign.findUnique({ where: { id: campaign.campaignId.toString() } })
    expect(updated?.status).toBe('Running')
  })

  it('returns 0 when there are no due campaigns', async () => {
    if (!dbAvailable) return
    const processed = await pollScheduledCampaigns(prisma, fakeQueue)
    expect(processed).toBe(0)
    expect(fakeQueue.add).not.toHaveBeenCalled()
  })
})
