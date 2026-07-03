import { ValueObject } from '../shared/ValueObject'

class Point extends ValueObject<{ x: number; y: number }> {
  constructor(x: number, y: number) {
    super({ x, y })
  }
}

class Other extends ValueObject<{ x: number; y: number }> {
  constructor(x: number, y: number) {
    super({ x, y })
  }
}

describe('ValueObject', () => {
  it('freezes props on construction', () => {
    const p = new Point(1, 2)
    expect(() => {
      ;(p as unknown as { props: { x: number } }).props.x = 99
    }).toThrow()
  })

  it('two instances with equal props are equal', () => {
    expect(new Point(1, 2).equals(new Point(1, 2))).toBe(true)
  })

  it('two instances with different props are not equal', () => {
    expect(new Point(1, 2).equals(new Point(1, 3))).toBe(false)
  })

  it('returns false when compared against null', () => {
    expect(new Point(1, 2).equals(null as unknown as Point)).toBe(false)
  })

  it('returns false when compared against undefined', () => {
    expect(new Point(1, 2).equals(undefined as unknown as Point)).toBe(false)
  })

  it('returns false when compared against a different class with same props', () => {
    expect(new Point(1, 2).equals(new Other(1, 2))).toBe(false)
  })
})
