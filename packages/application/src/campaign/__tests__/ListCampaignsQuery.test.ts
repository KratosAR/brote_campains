import { ChannelType, CampaignStatus, Campaign, CampaignAudience, CampaignSchedule } from '@bcp/domain'
import { ListCampaignsQuery } from '../ListCampaignsQuery'
import { InMemoryCampaignRepository } from './testDoubles'

describe('ListCampaignsQuery', () => {
  let repository: InMemoryCampaignRepository
  let query: ListCampaignsQuery

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    query = new ListCampaignsQuery(repository)
  })

  it('filters by status when provided', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const draft = Campaign.createDraft('ws-1', 'Draft', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    const running = Campaign.createDraft('ws-1', 'Running', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    running.schedule(
      CampaignSchedule.create({ sendAt: new Date(Date.now() + 60_000), timezone: 'UTC', sendNow: false }).getValue(),
    )
    running.start()
    await repository.save(draft)
    await repository.save(running)

    const page = await query.execute({ workspaceId: 'ws-1', status: CampaignStatus.Running, page: 1, limit: 10 })

    expect(page.items).toHaveLength(1)
    expect(page.items[0]!.name).toBe('Running')
  })

  it('returns all statuses when status is not provided', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const draft = Campaign.createDraft('ws-1', 'Draft', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    await repository.save(draft)

    const page = await query.execute({ workspaceId: 'ws-1', page: 1, limit: 10 })

    expect(page.items).toHaveLength(1)
  })
})
