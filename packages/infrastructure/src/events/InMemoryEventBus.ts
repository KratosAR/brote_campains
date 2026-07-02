import { DomainEvent } from '@bcp/domain'
import { IEventBus, EventHandler } from '@bcp/contracts'

export class InMemoryEventBus implements IEventBus {
  private readonly handlers = new Map<string, EventHandler[]>()

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) ?? []
    this.handlers.set(eventType, [...existing, handler])
  }

  async publish(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      const handlers = this.handlers.get(event.eventType) ?? []
      await Promise.all(handlers.map((h) => h(event)))
    }
  }
}
