import { Entity } from './Entity'
import { DomainEvent } from './DomainEvent'
import { UniqueId } from './UniqueId'

export abstract class AggregateRoot<T> extends Entity<T> {
  private _domainEvents: DomainEvent[] = []
  private _version: number = 0
  readonly createdAt: Date
  updatedAt: Date

  constructor(props: T, id?: UniqueId, createdAt?: Date) {
    super(props, id)
    this.createdAt = createdAt ?? new Date()
    this.updatedAt = this.createdAt
  }

  get version(): number {
    return this._version
  }

  get domainEvents(): ReadonlyArray<DomainEvent> {
    return this._domainEvents
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event)
    this.updatedAt = new Date()
    this._version++
  }

  clearDomainEvents(): DomainEvent[] {
    const events = [...this._domainEvents]
    this._domainEvents = []
    return events
  }
}
