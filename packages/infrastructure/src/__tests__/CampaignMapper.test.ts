import { Campaign, CampaignAudience, CampaignSchedule, ChannelType } from '@bcp/domain'

import { CampaignMapper } from '../persistence/CampaignMapper'

function makeCampaign(): Campaign {
  const audience = CampaignAudience.create({ type: 'all' }).getValue()
  return Campaign.createDraft('workspace-1', 'Welcome Blast', ChannelType.Email, audience, 'template-1').getValue()
}

describe('CampaignMapper', () => {
  it('round-trips a draft campaign through toPersistence/toDomain', () => {
    const campaign = makeCampaign()

    const record = CampaignMapper.toPersistence(campaign)
    const hydrated = CampaignMapper.toDomain(record as never)

    expect(hydrated.name).toBe('Welcome Blast')
    expect(hydrated.workspaceId).toBe('workspace-1')
    expect(hydrated.channel).toBe(ChannelType.Email)
    expect(hydrated.status).toBe(campaign.status)
    expect(hydrated.audience.type).toBe('all')
    expect(hydrated.templateId).toBe('template-1')
    expect(hydrated.timeline).toHaveLength(1)
  })

  it('round-trips a scheduled campaign with schedule info', () => {
    const campaign = makeCampaign()
    const sendAt = new Date(Date.now() + 60_000)
    const schedule = CampaignSchedule.create({ sendAt, timezone: 'America/Bogota', sendNow: false }).getValue()
    campaign.schedule(schedule)

    const record = CampaignMapper.toPersistence(campaign)
    const hydrated = CampaignMapper.toDomain(record as never)

    expect(hydrated.scheduleInfo?.timezone).toBe('America/Bogota')
    expect(hydrated.scheduleInfo?.sendAt.getTime()).toBe(sendAt.getTime())
  })
})
