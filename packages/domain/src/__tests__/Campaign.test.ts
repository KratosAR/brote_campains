import { Campaign } from '../campaign/Campaign'
import { CampaignStatus } from '../campaign/CampaignStatus'
import { CampaignAudience } from '../campaign/CampaignAudience'
import { CampaignSchedule } from '../campaign/CampaignSchedule'
import { DeliveryPolicy } from '../campaign/DeliveryPolicy'
import { ChannelType } from '../contact/ChannelType'
import { BusinessRuleViolationError } from '../shared/errors/DomainError'
import {
  CampaignCreated,
  CampaignScheduled,
  CampaignStarted,
  CampaignPaused,
  CampaignResumed,
  CampaignCancelled,
  CampaignCompleted,
  CampaignArchived,
} from '../campaign/events/CampaignEvents'

function makeAudience(estimatedCount = 10) {
  return CampaignAudience.create({ type: 'all', estimatedCount }).getValue()
}

function makeSchedule(sendAtOffsetMs = 60_000) {
  return CampaignSchedule.create({
    sendAt: new Date(Date.now() + sendAtOffsetMs),
    timezone: 'America/Argentina/Cordoba',
    sendNow: false,
  }).getValue()
}

function draft(estimatedCount = 10) {
  return Campaign.createDraft(
    'workspace-1',
    'Promo Julio',
    ChannelType.WhatsApp,
    makeAudience(estimatedCount),
    'template-1',
  ).getValue()
}

function scheduled(estimatedCount = 10) {
  const campaign = draft(estimatedCount)
  campaign.schedule(makeSchedule())
  return campaign
}

function running(estimatedCount = 10) {
  const campaign = scheduled(estimatedCount)
  campaign.start()
  return campaign
}

describe('Campaign.createDraft', () => {
  it('creates a draft campaign with zeroed statistics and default delivery policy', () => {
    const campaign = draft()

    expect(campaign.status).toBe(CampaignStatus.Draft)
    expect(campaign.statistics.total).toBe(0)
    expect(campaign.deliveryPolicy.maxRetries).toBe(3)
    expect(campaign.timeline).toHaveLength(1)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignCreated)).toBe(true)
  })

  it('forces skipOptOut to false even if a caller tries to override it', () => {
    // @ts-expect-error ponytail: skipOptOut no es un parámetro aceptado por DeliveryPolicy.create
    const policy = DeliveryPolicy.create({ maxRetries: 5, retryDelays: [10], skipOptOut: true })
    expect(policy.skipOptOut).toBe(false)
  })

  it('DeliveryPolicy.default() has skipOptOut false', () => {
    expect(DeliveryPolicy.default().skipOptOut).toBe(false)
  })
})

describe('Campaign transitions — valid path', () => {
  it('Draft -> Scheduled', () => {
    const campaign = draft()
    const result = campaign.schedule(makeSchedule())

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Scheduled)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignScheduled)).toBe(true)
  })

  it('Scheduled -> Running', () => {
    const campaign = scheduled()
    const result = campaign.start()

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Running)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignStarted)).toBe(true)
  })

  it('Running -> Paused', () => {
    const campaign = running()
    const result = campaign.pause('operator request')

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Paused)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignPaused)).toBe(true)
  })

  it('Paused -> Running (resume)', () => {
    const campaign = running()
    campaign.pause()
    const result = campaign.resume()

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Running)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignResumed)).toBe(true)
  })

  it('Running -> Completed', () => {
    const campaign = running()
    const result = campaign.complete()

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Completed)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignCompleted)).toBe(true)
  })

  it('Completed -> Archived', () => {
    const campaign = running()
    campaign.complete()
    const result = campaign.archive()

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Archived)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignArchived)).toBe(true)
  })

  it('Cancelled -> Archived', () => {
    const campaign = draft()
    campaign.cancel()
    const result = campaign.archive()

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Archived)
  })

  it.each([
    ['Draft', () => draft()],
    ['Scheduled', () => scheduled()],
    ['Running', () => running()],
    ['Paused', () => { const c = running(); c.pause(); return c }],
  ] as const)('%s -> Cancelled', (_label, factory) => {
    const campaign = factory()
    const result = campaign.cancel('budget cut')

    expect(result.isOk()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Cancelled)
    expect(campaign.domainEvents.some((e) => e instanceof CampaignCancelled)).toBe(true)
  })
})

describe('Campaign transitions — forbidden', () => {
  it('Draft -> Completed fails (must go through Scheduled -> Running first)', () => {
    const campaign = draft()
    const result = campaign.complete()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
    expect(campaign.status).toBe(CampaignStatus.Draft)
  })

  it('Cancelled -> Running fails', () => {
    const campaign = draft()
    campaign.cancel()
    const result = campaign.start()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it.each([
    ['schedule', (c: Campaign) => c.schedule(makeSchedule())],
    ['start', (c: Campaign) => c.start()],
    ['pause', (c: Campaign) => c.pause()],
    ['resume', (c: Campaign) => c.resume()],
    ['cancel', (c: Campaign) => c.cancel()],
    ['complete', (c: Campaign) => c.complete()],
    ['archive', (c: Campaign) => c.archive()],
  ] as const)('Archived -> * fails for %s', (_label, action) => {
    const campaign = draft()
    campaign.cancel()
    campaign.archive()

    const result = action(campaign)

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
    expect(campaign.status).toBe(CampaignStatus.Archived)
  })

  it('start() fails from Draft', () => {
    const campaign = draft()
    const result = campaign.start()

    expect(result.isFail()).toBe(true)
  })

  it('pause() fails from Draft', () => {
    const campaign = draft()
    const result = campaign.pause()

    expect(result.isFail()).toBe(true)
  })

  it('archive() fails from Running', () => {
    const campaign = running()
    const result = campaign.archive()

    expect(result.isFail()).toBe(true)
    expect(campaign.status).toBe(CampaignStatus.Running)
  })

  it('cancel() fails from Completed', () => {
    const campaign = running()
    campaign.complete()
    const result = campaign.cancel()

    expect(result.isFail()).toBe(true)
  })

  it('start() fails when the campaign has no audience (estimatedCount 0)', () => {
    const campaign = scheduled(0)
    const result = campaign.start()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
    expect(campaign.status).toBe(CampaignStatus.Scheduled)
  })
})

describe('Campaign.canStart', () => {
  it('succeeds when audience is not resolved yet (estimatedCount undefined)', () => {
    const campaign = Campaign.createDraft(
      'workspace-1',
      'Promo',
      ChannelType.WhatsApp,
      CampaignAudience.create({ type: 'all' }).getValue(),
      'template-1',
    ).getValue()

    expect(campaign.canStart().isOk()).toBe(true)
  })

  it('fails when estimatedCount is 0', () => {
    const campaign = draft(0)
    expect(campaign.canStart().isFail()).toBe(true)
  })
})

describe('Campaign.updateStatistics', () => {
  it('sums deltas immutably', () => {
    const campaign = draft()

    campaign.updateStatistics({ total: 10, pending: 10 })
    expect(campaign.statistics.total).toBe(10)
    expect(campaign.statistics.pending).toBe(10)

    campaign.updateStatistics({ pending: -3, sent: 3 })
    expect(campaign.statistics.pending).toBe(7)
    expect(campaign.statistics.sent).toBe(3)
    expect(campaign.statistics.total).toBe(10)
  })

  it('does not emit a domain event', () => {
    const campaign = draft()
    campaign.clearDomainEvents()

    campaign.updateStatistics({ total: 5 })

    expect(campaign.domainEvents).toHaveLength(0)
  })
})

describe('Campaign timeline', () => {
  it('adds a timeline entry on every valid transition', () => {
    const campaign = draft()
    expect(campaign.timeline).toHaveLength(1)

    campaign.schedule(makeSchedule())
    expect(campaign.timeline).toHaveLength(2)

    campaign.start()
    expect(campaign.timeline).toHaveLength(3)

    campaign.pause()
    expect(campaign.timeline).toHaveLength(4)

    campaign.resume()
    expect(campaign.timeline).toHaveLength(5)

    campaign.complete()
    expect(campaign.timeline).toHaveLength(6)

    campaign.archive()
    expect(campaign.timeline).toHaveLength(7)
  })

  it('does not add a timeline entry on a failed transition', () => {
    const campaign = draft()
    const before = campaign.timeline.length

    campaign.complete()

    expect(campaign.timeline).toHaveLength(before)
  })
})
