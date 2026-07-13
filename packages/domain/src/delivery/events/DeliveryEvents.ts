import { DomainEvent } from '../../shared/DomainEvent'
import { DeliveryStatus } from '../DeliveryStatus'

export class DeliveryQueued extends DomainEvent {
  readonly eventType = 'DeliveryQueued'
  readonly aggregateType = 'Delivery'

  constructor(
    readonly aggregateId: string,
    readonly deliveryId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class DeliveryFailed extends DomainEvent {
  readonly eventType = 'DeliveryFailed'
  readonly aggregateType = 'Delivery'

  constructor(
    readonly aggregateId: string,
    readonly deliveryId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly attemptNumber: number,
    readonly errorCode?: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class DeliveryCompleted extends DomainEvent {
  readonly eventType = 'DeliveryCompleted'
  readonly aggregateType = 'Delivery'

  constructor(
    readonly aggregateId: string,
    readonly deliveryId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    readonly status: DeliveryStatus,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class DeliveryExpired extends DomainEvent {
  readonly eventType = 'DeliveryExpired'
  readonly aggregateType = 'Delivery'

  constructor(
    readonly aggregateId: string,
    readonly deliveryId: string,
    readonly campaignId: string,
    readonly workspaceId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}
