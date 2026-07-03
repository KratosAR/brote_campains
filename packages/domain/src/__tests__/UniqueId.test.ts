import { UniqueId } from '../shared/UniqueId'

describe('UniqueId', () => {
  it('generates a non-empty id', () => {
    const id = UniqueId.generate()
    expect(id.toString().length).toBeGreaterThan(0)
  })

  it('generates unique ids', () => {
    expect(UniqueId.generate().toString()).not.toBe(UniqueId.generate().toString())
  })

  it('builds from a given string value', () => {
    const id = UniqueId.from('abc123')
    expect(id.toString()).toBe('abc123')
  })

  it('throws when value is empty', () => {
    expect(() => UniqueId.from('')).toThrow('UniqueId cannot be empty')
  })

  it('throws when value is only whitespace', () => {
    expect(() => UniqueId.from('   ')).toThrow('UniqueId cannot be empty')
  })

  it('two ids with the same value are equal', () => {
    expect(UniqueId.from('same').equals(UniqueId.from('same'))).toBe(true)
  })

  it('two ids with different values are not equal', () => {
    expect(UniqueId.from('a').equals(UniqueId.from('b'))).toBe(false)
  })
})
