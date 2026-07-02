import { AggregateRoot } from '../shared/AggregateRoot'
import { DomainEvent } from '../shared/DomainEvent'
import { UniqueId } from '../shared/UniqueId'

class TestEvent extends DomainEvent {
  readonly eventType = 'TestEvent'
  readonly aggregateType = 'Test'
  readonly aggregateId: string

  constructor(aggregateId: string) {
    super()
    this.aggregateId = aggregateId
  }
}

interface TestProps {
  name: string
}

class TestAggregate extends AggregateRoot<TestProps> {
  static create(name: string): TestAggregate {
    const agg = new TestAggregate({ name })
    agg.addDomainEvent(new TestEvent(agg.id.toString()))
    return agg
  }

  rename(name: string): void {
    this.props = { name }
    this.addDomainEvent(new TestEvent(this.id.toString()))
  }

  get name(): string {
    return this.props.name
  }
}

describe('AggregateRoot', () => {
  it('generates an id on creation', () => {
    const agg = TestAggregate.create('test')
    expect(agg.id).toBeDefined()
    expect(agg.id.toString().length).toBeGreaterThan(0)
  })

  it('collects domain events', () => {
    const agg = TestAggregate.create('test')
    expect(agg.domainEvents).toHaveLength(1)
  })

  it('accumulates multiple events', () => {
    const agg = TestAggregate.create('test')
    agg.rename('other')
    expect(agg.domainEvents).toHaveLength(2)
  })

  it('clearDomainEvents returns and empties the list', () => {
    const agg = TestAggregate.create('test')
    const events = agg.clearDomainEvents()
    expect(events).toHaveLength(1)
    expect(agg.domainEvents).toHaveLength(0)
  })

  it('increments version on each event', () => {
    const agg = TestAggregate.create('test')
    expect(agg.version).toBe(1)
    agg.rename('other')
    expect(agg.version).toBe(2)
  })

  it('two aggregates with the same id are equal', () => {
    const id = UniqueId.generate()
    const a = new TestAggregate({ name: 'a' }, id)
    const b = new TestAggregate({ name: 'b' }, id)
    expect(a.equals(b)).toBe(true)
  })

  it('two aggregates with different ids are not equal', () => {
    const a = TestAggregate.create('a')
    const b = TestAggregate.create('b')
    expect(a.equals(b)).toBe(false)
  })
})
