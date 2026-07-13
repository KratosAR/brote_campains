import { ChannelType, Campaign, CampaignAudience } from '@bcp/domain'
import { GetCampaignQuery } from '../GetCampaignQuery'
import { InMemoryCampaignRepository } from './testDoubles'

describe('GetCampaignQuery', () => {
  let repository: InMemoryCampaignRepository
  let query: GetCampaignQuery

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    query = new GetCampaignQuery(repository)
  })

  it('returns the campaign when found', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    await repository.save(campaign)

    const result = await query.execute({ campaignId: campaign.campaignId.toString(), workspaceId: 'ws-1' })

    expect(result.isOk()).toBe(true)
    expect(result.getValue().name).toBe('Campaign')
  })

  it('fails when not found', async () => {
    const result = await query.execute({ campaignId: 'nonexistent', workspaceId: 'ws-1' })
    expect(result.isFail()).toBe(true)
  })
})
