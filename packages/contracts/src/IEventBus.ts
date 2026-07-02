import { DomainEvent } from '@bcp/domain'

export type EventHandler = (event: DomainEvent) => Promise<void>

export interface IEventBus {
  publish(events: DomainEvent[]): Promise<void>
  subscribe(eventType: string, handler: EventHandler): void
}
