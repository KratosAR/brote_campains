import { DomainEvent } from '../../shared/DomainEvent'
import { ChannelType } from '../../contact/ChannelType'
import { CampaignStatisticsProps } from '../CampaignStatistics'

export class CampaignCreated extends DomainEvent {
  readonly eventType = 'CampaignCreated'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly name: string,
    readonly channel: ChannelType,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class CampaignScheduled extends DomainEvent {
  readonly eventType = 'CampaignScheduled'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly scheduledAt: Date,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class CampaignStarted extends DomainEvent {
  readonly eventType = 'CampaignStarted'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly startedAt: Date,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class CampaignPaused extends DomainEvent {
  readonly eventType = 'CampaignPaused'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly reason?: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class CampaignResumed extends DomainEvent {
  readonly eventType = 'CampaignResumed'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class CampaignCancelled extends DomainEvent {
  readonly eventType = 'CampaignCancelled'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly reason?: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class CampaignCompleted extends DomainEvent {
  readonly eventType = 'CampaignCompleted'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly statistics: CampaignStatisticsProps,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class CampaignArchived extends DomainEvent {
  readonly eventType = 'CampaignArchived'
  readonly aggregateType = 'Campaign'

  constructor(
    readonly aggregateId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}
