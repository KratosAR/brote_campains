import { ChannelType, CampaignStatus, Campaign, CampaignAudience, CampaignSchedule } from '@bcp/domain'
import { CancelCampaignCommand } from '../CancelCampaignCommand'
import { InMemoryCampaignRepository } from './testDoubles'

describe('CancelCampaignCommand', () => {
  let repository: InMemoryCampaignRepository
  let command: CancelCampaignCommand

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    command = new CancelCampaignCommand(repository)
  })

  it('cancels a Draft campaign', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    await repository.save(campaign)

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      reason: 'not needed anymore',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    expect(repository.campaigns.get(campaign.campaignId.toString())!.status).toBe(CampaignStatus.Cancelled)
  })

  it('fails to cancel a Completed campaign', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    campaign.schedule(
      CampaignSchedule.create({ sendAt: new Date(Date.now() + 60_000), timezone: 'UTC', sendNow: false }).getValue(),
    )
    campaign.start()
    campaign.complete()
    await repository.save(campaign)

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
