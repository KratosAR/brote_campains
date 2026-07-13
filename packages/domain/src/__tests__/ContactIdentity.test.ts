import { ContactIdentity } from '../contact/ContactIdentity'

describe('ContactIdentity', () => {
  it('creates a valid identity with only firstName', () => {
    const result = ContactIdentity.create({ firstName: 'Ada' })
    expect(result.isOk()).toBe(true)
    expect(result.getValue().firstName).toBe('Ada')
  })

  it('rejects an empty firstName', () => {
    const result = ContactIdentity.create({ firstName: '' })
    expect(result.isFail()).toBe(true)
  })

  it('rejects a blank firstName', () => {
    const result = ContactIdentity.create({ firstName: '   ' })
    expect(result.isFail()).toBe(true)
  })

  it('trims optional fields', () => {
    const result = ContactIdentity.create({
      firstName: ' Ada ',
      lastName: ' Lovelace ',
      company: ' Analytical Engines ',
    })
    const identity = result.getValue()
    expect(identity.firstName).toBe('Ada')
    expect(identity.lastName).toBe('Lovelace')
    expect(identity.company).toBe('Analytical Engines')
  })

  it('computes fullName from firstName and lastName', () => {
    const identity = ContactIdentity.create({ firstName: 'Ada', lastName: 'Lovelace' }).getValue()
    expect(identity.fullName).toBe('Ada Lovelace')
  })
})
