import { ChannelType, CampaignStatus, Campaign, CampaignAudience, CampaignSchedule } from '@bcp/domain'
import { PauseCampaignCommand } from '../PauseCampaignCommand'
import { InMemoryCampaignRepository } from './testDoubles'

describe('PauseCampaignCommand', () => {
  let repository: InMemoryCampaignRepository
  let command: PauseCampaignCommand

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    command = new PauseCampaignCommand(repository)
  })

  async function createRunning(): Promise<Campaign> {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    campaign.schedule(
      CampaignSchedule.create({ sendAt: new Date(Date.now() + 60_000), timezone: 'UTC', sendNow: false }).getValue(),
    )
    campaign.start()
    await repository.save(campaign)
    return campaign
  }

  it('pauses a Running campaign', async () => {
    const campaign = await createRunning()

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      reason: 'maintenance',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    expect(repository.campaigns.get(campaign.campaignId.toString())!.status).toBe(CampaignStatus.Paused)
  })

  it('fails to pause a Draft campaign', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const draft = Campaign.createDraft('ws-1', 'Draft Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    await repository.save(draft)

    const result = await command.execute({
      campaignId: draft.campaignId.toString(),
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
