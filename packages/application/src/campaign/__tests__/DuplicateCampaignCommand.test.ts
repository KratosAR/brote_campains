import { ChannelType, CampaignStatus, Campaign, CampaignAudience, CampaignSchedule } from '@bcp/domain'
import { DuplicateCampaignCommand } from '../DuplicateCampaignCommand'
import { InMemoryCampaignRepository } from './testDoubles'

describe('DuplicateCampaignCommand', () => {
  let repository: InMemoryCampaignRepository
  let command: DuplicateCampaignCommand

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    command = new DuplicateCampaignCommand(repository)
  })

  it('creates a new Draft campaign without schedule from a scheduled one', async () => {
    const audience = CampaignAudience.create({ type: 'all' }).getValue()
    const original = Campaign.createDraft('ws-1', 'Original', ChannelType.WhatsApp, audience, 'tpl-1').getValue()
    original.schedule(
      CampaignSchedule.create({ sendAt: new Date(Date.now() + 60_000), timezone: 'UTC', sendNow: false }).getValue(),
    )
    await repository.save(original)

    const result = await command.execute({
      campaignId: original.campaignId.toString(),
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    const duplicate = repository.campaigns.get(result.getValue().campaignId)!
    expect(duplicate.campaignId.toString()).not.toBe(original.campaignId.toString())
    expect(duplicate.name).toBe('Original (copy)')
    expect(duplicate.status).toBe(CampaignStatus.Draft)
    expect(duplicate.scheduleInfo).toBeUndefined()
  })

  it('fails when original campaign does not exist', async () => {
    const result = await command.execute({
      campaignId: 'nonexistent',
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
