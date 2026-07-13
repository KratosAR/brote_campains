import { ChannelType, Campaign, CampaignAudience } from '@bcp/domain'
import { GetCampaignTimelineQuery } from '../GetCampaignTimelineQuery'
import { InMemoryCampaignRepository } from './testDoubles'

describe('GetCampaignTimelineQuery', () => {
  let repository: InMemoryCampaignRepository
  let query: GetCampaignTimelineQuery

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    query = new GetCampaignTimelineQuery(repository)
  })

  it('returns the timeline entries for the campaign', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    await repository.save(campaign)

    const result = await query.execute({ campaignId: campaign.campaignId.toString(), workspaceId: 'ws-1' })

    expect(result.isOk()).toBe(true)
    expect(result.getValue()).toHaveLength(1)
    expect(result.getValue()[0]!.event).toBe('CampaignCreated')
  })

  it('fails when campaign does not exist', async () => {
    const result = await query.execute({ campaignId: 'nonexistent', workspaceId: 'ws-1' })
    expect(result.isFail()).toBe(true)
  })
})
