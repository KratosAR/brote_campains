import { AndSpecification, OrSpecification, NotSpecification, Specification } from '../shared/Specification'

const always = (result: boolean): Specification<number> => ({
  isSatisfiedBy: () => result,
})

describe('AndSpecification', () => {
  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])('left=%s right=%s -> %s', (left, right, expected) => {
    const spec = new AndSpecification(always(left), always(right))
    expect(spec.isSatisfiedBy(1)).toBe(expected)
  })
})

describe('OrSpecification', () => {
  it.each([
    [true, true, true],
    [true, false, true],
    [false, true, true],
    [false, false, false],
  ])('left=%s right=%s -> %s', (left, right, expected) => {
    const spec = new OrSpecification(always(left), always(right))
    expect(spec.isSatisfiedBy(1)).toBe(expected)
  })
})

describe('NotSpecification', () => {
  it('negates the wrapped specification', () => {
    expect(new NotSpecification(always(true)).isSatisfiedBy(1)).toBe(false)
    expect(new NotSpecification(always(false)).isSatisfiedBy(1)).toBe(true)
  })
})
