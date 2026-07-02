import { UniqueId } from './UniqueId'

export abstract class DomainEvent {
  readonly eventId: string
  readonly occurredAt: Date
  abstract readonly eventType: string
  abstract readonly aggregateId: string
  abstract readonly aggregateType: string

  constructor(public readonly correlationId: string = '') {
    this.eventId = UniqueId.generate().toString()
    this.occurredAt = new Date()
  }
}
