import { SystemClock, FixedClock } from '../shared/Clock'

describe('SystemClock', () => {
  it('returns the current date/time', () => {
    const before = Date.now()
    const now = new SystemClock().now()
    const after = Date.now()
    expect(now.getTime()).toBeGreaterThanOrEqual(before)
    expect(now.getTime()).toBeLessThanOrEqual(after)
  })
})

describe('FixedClock', () => {
  it('always returns the fixed date', () => {
    const fixed = new Date('2024-01-01T00:00:00Z')
    const clock = new FixedClock(fixed)
    expect(clock.now()).toBe(fixed)
    expect(clock.now()).toBe(fixed)
  })
})
