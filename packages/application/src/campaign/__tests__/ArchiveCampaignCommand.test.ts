import { ChannelType, CampaignStatus, Campaign, CampaignAudience, CampaignSchedule } from '@bcp/domain'
import { ArchiveCampaignCommand } from '../ArchiveCampaignCommand'
import { InMemoryCampaignRepository } from './testDoubles'

describe('ArchiveCampaignCommand', () => {
  let repository: InMemoryCampaignRepository
  let command: ArchiveCampaignCommand

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    command = new ArchiveCampaignCommand(repository)
  })

  it('archives a Cancelled campaign', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    campaign.cancel()
    await repository.save(campaign)

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    expect(repository.campaigns.get(campaign.campaignId.toString())!.status).toBe(CampaignStatus.Archived)
  })

  it('fails to archive a Running campaign', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    campaign.schedule(
      CampaignSchedule.create({ sendAt: new Date(Date.now() + 60_000), timezone: 'UTC', sendNow: false }).getValue(),
    )
    campaign.start()
    await repository.save(campaign)

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
