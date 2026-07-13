import { PrismaClient } from '@prisma/client'
import { Campaign, CampaignAudience, CampaignId, CampaignStatus, ChannelType } from '@bcp/domain'

import { PrismaCampaignRepository } from '../persistence/PrismaCampaignRepository'

// ponytail: needs a real Postgres reachable via DATABASE_URL (see prisma/schema.prisma).
// Same probe-and-no-op pattern as PrismaTemplateRepository.integration.test.ts — no DB
// service in this sandbox.
describe('PrismaCampaignRepository (integration)', () => {
  const prisma = new PrismaClient()
  const repo = new PrismaCampaignRepository(prisma)
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
    if (dbAvailable) await prisma.campaign.deleteMany({ where: { workspaceId } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makeCampaign(name: string): Campaign {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    return Campaign.createDraft(workspaceId, name, ChannelType.Email, audience, 'template-1').getValue()
  }

  it('saves and finds a campaign by id', async () => {
    if (!dbAvailable) return
    const campaign = makeCampaign('Welcome')
    await repo.save(campaign)

    const result = await repo.findById(campaign.campaignId, workspaceId)

    expect(result.isOk()).toBe(true)
    expect(result.getValue().name).toBe('Welcome')
  })

  it('returns NotFoundError for unknown id', async () => {
    if (!dbAvailable) return
    const result = await repo.findById(CampaignId.generate(), workspaceId)
    expect(result.isFail()).toBe(true)
  })

  it('finds by status with pagination', async () => {
    if (!dbAvailable) return
    await repo.save(makeCampaign('A'))
    await repo.save(makeCampaign('B'))

    const page = await repo.findByStatus(workspaceId, [CampaignStatus.Draft], { page: 1, limit: 10 })

    expect(page.total).toBe(2)
  })

  it('finds running campaigns for a workspace', async () => {
    if (!dbAvailable) return
    const running = await repo.findRunning(workspaceId)
    expect(running).toEqual([])
  })
})
