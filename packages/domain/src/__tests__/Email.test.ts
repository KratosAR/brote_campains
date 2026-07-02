import { Email } from '../shared/value-objects/Email'

describe('Email', () => {
  it('creates a valid email', () => {
    const result = Email.create('user@example.com')
    expect(result.isOk()).toBe(true)
    expect(result.getValue().toString()).toBe('user@example.com')
  })

  it('normalizes to lowercase', () => {
    expect(Email.create('USER@EXAMPLE.COM').getValue().toString()).toBe('user@example.com')
  })

  it('trims whitespace', () => {
    expect(Email.create('  user@example.com  ').getValue().toString()).toBe('user@example.com')
  })

  it('two emails with the same address are equal', () => {
    const a = Email.create('user@example.com').getValue()
    const b = Email.create('USER@example.com').getValue()
    expect(a.equals(b)).toBe(true)
  })

  it('fails on empty string', () => {
    expect(Email.create('').isFail()).toBe(true)
  })

  it('fails on missing @', () => {
    expect(Email.create('notanemail').isFail()).toBe(true)
  })

  it('fails on missing domain', () => {
    expect(Email.create('user@').isFail()).toBe(true)
  })
})
