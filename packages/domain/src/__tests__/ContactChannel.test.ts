import { ContactChannel } from '../contact/ContactChannel'
import { ChannelType } from '../contact/ChannelType'

describe('ContactChannel', () => {
  it('creates a valid WhatsApp channel normalized to E.164', () => {
    const result = ContactChannel.create(ChannelType.WhatsApp, '+54 9 11 1234-5678')
    expect(result.isOk()).toBe(true)
    expect(result.getValue().value).toMatch(/^\+\d+$/)
  })

  it('rejects an invalid WhatsApp phone number', () => {
    const result = ContactChannel.create(ChannelType.WhatsApp, 'not-a-phone')
    expect(result.isFail()).toBe(true)
  })

  it('rejects an invalid SMS phone number', () => {
    const result = ContactChannel.create(ChannelType.SMS, '123')
    expect(result.isFail()).toBe(true)
  })

  it('creates a valid Email channel normalized to lowercase', () => {
    const result = ContactChannel.create(ChannelType.Email, 'Foo@Example.com')
    expect(result.isOk()).toBe(true)
    expect(result.getValue().value).toBe('foo@example.com')
  })

  it('rejects an invalid email', () => {
    const result = ContactChannel.create(ChannelType.Email, 'not-an-email')
    expect(result.isFail()).toBe(true)
  })

  it('accepts a Telegram handle as free-form value', () => {
    const result = ContactChannel.create(ChannelType.Telegram, '@someuser')
    expect(result.isOk()).toBe(true)
    expect(result.getValue().value).toBe('@someuser')
  })

  it('defaults verified and isPrimary to false', () => {
    const result = ContactChannel.create(ChannelType.Email, 'foo@example.com')
    const channel = result.getValue()
    expect(channel.verified).toBe(false)
    expect(channel.isPrimary).toBe(false)
  })

  it('respects verified and isPrimary options', () => {
    const result = ContactChannel.create(ChannelType.Email, 'foo@example.com', {
      verified: true,
      isPrimary: true,
    })
    const channel = result.getValue()
    expect(channel.verified).toBe(true)
    expect(channel.isPrimary).toBe(true)
  })

  it('sameChannelAs detects duplicate type+value', () => {
    const a = ContactChannel.create(ChannelType.Email, 'foo@example.com').getValue()
    const b = ContactChannel.create(ChannelType.Email, 'FOO@example.com').getValue()
    expect(a.sameChannelAs(b)).toBe(true)
  })
})
