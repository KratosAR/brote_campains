import { ChannelType, CampaignStatus } from '@bcp/domain'
import { CreateCampaignCommand } from '../CreateCampaignCommand'
import { InMemoryCampaignRepository } from './testDoubles'

describe('CreateCampaignCommand', () => {
  let repository: InMemoryCampaignRepository
  let command: CreateCampaignCommand

  beforeEach(() => {
    repository = new InMemoryCampaignRepository()
    command = new CreateCampaignCommand(repository)
  })

  it('creates a Draft campaign without schedule when scheduledAt is not provided', async () => {
    const result = await command.execute({
      workspaceId: 'ws-1',
      name: 'Welcome Campaign',
      channel: ChannelType.WhatsApp,
      audienceType: 'all',
      templateId: 'tpl-1',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    const saved = repository.campaigns.get(result.getValue().campaignId)!
    expect(saved.status).toBe(CampaignStatus.Draft)
    expect(saved.scheduleInfo).toBeUndefined()
  })

  it('creates a Draft campaign with schedule when scheduledAt is provided', async () => {
    const scheduledAt = new Date(Date.now() + 60_000)
    const result = await command.execute({
      workspaceId: 'ws-1',
      name: 'Scheduled Campaign',
      channel: ChannelType.Email,
      audienceType: 'group',
      audienceGroupIds: ['g-1'],
      templateId: 'tpl-1',
      scheduledAt,
      timezone: 'America/Argentina/Buenos_Aires',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    const saved = repository.campaigns.get(result.getValue().campaignId)!
    expect(saved.status).toBe(CampaignStatus.Draft)
    expect(saved.scheduleInfo?.sendAt.getTime()).toBe(scheduledAt.getTime())
  })

  it('fails when audience type is group without groupIds', async () => {
    const result = await command.execute({
      workspaceId: 'ws-1',
      name: 'Bad Campaign',
      channel: ChannelType.WhatsApp,
      audienceType: 'group',
      templateId: 'tpl-1',
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
