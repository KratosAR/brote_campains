import { ChannelType, CampaignStatus, Campaign, CampaignAudience, CampaignSchedule } from '@bcp/domain'
import { ResumeCampaignCommand } from '../ResumeCampaignCommand'
import { InMemoryCampaignRepository } from './testDoubles'

describe('ResumeCampaignCommand', () => {
  let repository: InMemoryCampaignRepository
  let command: ResumeCampaignCommand

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    command = new ResumeCampaignCommand(repository)
  })

  async function createPaused(): Promise<Campaign> {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const campaign = Campaign.createDraft('ws-1', 'Campaign', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    campaign.schedule(
      CampaignSchedule.create({ sendAt: new Date(Date.now() + 60_000), timezone: 'UTC', sendNow: false }).getValue(),
    )
    campaign.start()
    campaign.pause()
    await repository.save(campaign)
    return campaign
  }

  it('resumes a Paused campaign', async () => {
    const campaign = await createPaused()

    const result = await command.execute({
      campaignId: campaign.campaignId.toString(),
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    expect(repository.campaigns.get(campaign.campaignId.toString())!.status).toBe(CampaignStatus.Running)
  })

  it('fails to resume a Draft campaign', async () => {
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
