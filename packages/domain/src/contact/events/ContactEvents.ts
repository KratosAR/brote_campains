import { DomainEvent } from '../../shared/DomainEvent'
import { ChannelType } from '../ChannelType'

interface ContactChannelSummary {
  type: ChannelType
  value: string
}

export class ContactCreated extends DomainEvent {
  readonly eventType = 'ContactCreated'
  readonly aggregateType = 'Contact'

  constructor(
    readonly aggregateId: string,
    readonly contactId: string,
    readonly workspaceId: string,
    readonly channels: ContactChannelSummary[],
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class ContactUpdated extends DomainEvent {
  readonly eventType = 'ContactUpdated'
  readonly aggregateType = 'Contact'

  constructor(
    readonly aggregateId: string,
    readonly contactId: string,
    readonly workspaceId: string,
    readonly changes: Record<string, unknown>,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class ContactOptedOut extends DomainEvent {
  readonly eventType = 'ContactOptedOut'
  readonly aggregateType = 'Contact'

  constructor(
    readonly aggregateId: string,
    readonly contactId: string,
    readonly workspaceId: string,
    readonly optedOutAt: Date,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class ContactOptedIn extends DomainEvent {
  readonly eventType = 'ContactOptedIn'
  readonly aggregateType = 'Contact'

  constructor(
    readonly aggregateId: string,
    readonly contactId: string,
    readonly workspaceId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class ContactArchived extends DomainEvent {
  readonly eventType = 'ContactArchived'
  readonly aggregateType = 'Contact'

  constructor(
    readonly aggregateId: string,
    readonly contactId: string,
    readonly workspaceId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class ContactsImported extends DomainEvent {
  readonly eventType = 'ContactsImported'
  readonly aggregateType = 'Contact'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    readonly total: number,
    readonly successful: number,
    readonly failed: number,
    readonly errors: string[],
    correlationId?: string,
  ) {
    super(correlationId)
  }
}
