import { Entity } from '../shared/Entity'
import { UniqueId } from '../shared/UniqueId'

class Widget extends Entity<{ name: string }> {
  constructor(props: { name: string }, id?: UniqueId) {
    super(props, id)
  }
}

describe('Entity', () => {
  it('generates an id when none is given', () => {
    const w = new Widget({ name: 'a' })
    expect(w.id.toString().length).toBeGreaterThan(0)
  })

  it('uses the given id', () => {
    const id = UniqueId.from('fixed-id')
    const w = new Widget({ name: 'a' }, id)
    expect(w.id.equals(id)).toBe(true)
  })

  it('two entities with the same id are equal', () => {
    const id = UniqueId.generate()
    const a = new Widget({ name: 'a' }, id)
    const b = new Widget({ name: 'b' }, id)
    expect(a.equals(b)).toBe(true)
  })

  it('two entities with different ids are not equal', () => {
    const a = new Widget({ name: 'a' })
    const b = new Widget({ name: 'a' })
    expect(a.equals(b)).toBe(false)
  })

  it('returns false when compared against null or undefined', () => {
    const a = new Widget({ name: 'a' })
    expect(a.equals(null as unknown as Widget)).toBe(false)
    expect(a.equals(undefined as unknown as Widget)).toBe(false)
  })

  it('returns false when compared against a non-Entity', () => {
    const a = new Widget({ name: 'a' })
    expect(a.equals({} as Widget)).toBe(false)
  })
})
