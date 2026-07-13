import { ChannelType, CampaignStatus, Campaign, CampaignAudience, CampaignSchedule } from '@bcp/domain'
import { ScheduleCampaignCommand } from '../ScheduleCampaignCommand'
import { InMemoryCampaignRepository } from './testDoubles'

describe('ScheduleCampaignCommand', () => {
  let repository: InMemoryCampaignRepository
  let command: ScheduleCampaignCommand

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    command = new ScheduleCampaignCommand(repository)
  })

  async function createDraft(): Promise<Campaign> {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    await repository.save(campaign)
    return campaign
  }

  it('schedules a Draft campaign', async () => {
    const campaign = await createDraft()

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      scheduledAt: new Date(Date.now() + 60_000),
      timezone: 'UTC',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    const saved = repository.campaigns.get(campaign.campaignId.toString())!
    expect(saved.status).toBe(CampaignStatus.Scheduled)
  })

  it('fails when campaign is already Scheduled', async () => {
    const campaign = await createDraft()
    campaign.schedule(
      CampaignSchedule.create({
        sendAt: new Date(Date.now() + 60_000),
        timezone: 'UTC',
        sendNow: false,
      }).getValue(),
    )
    await repository.save(campaign)

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      scheduledAt: new Date(Date.now() + 120_000),
      timezone: 'UTC',
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
