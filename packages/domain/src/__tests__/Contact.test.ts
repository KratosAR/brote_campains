import { Contact } from '../contact/Contact'
import { ContactIdentity } from '../contact/ContactIdentity'
import { ContactChannel } from '../contact/ContactChannel'
import { ChannelType } from '../contact/ChannelType'
import { ContactStatus } from '../contact/ContactStatus'
import { BusinessRuleViolationError, ValidationError } from '../shared/errors/DomainError'

function makeIdentity() {
  return ContactIdentity.create({ firstName: 'Ada', lastName: 'Lovelace' }).getValue()
}

function makeChannel(type: ChannelType = ChannelType.Email, value = 'ada@example.com') {
  return ContactChannel.create(type, value).getValue()
}

describe('Contact', () => {
  it('creates a contact in Active status and emits ContactCreated', () => {
    const result = Contact.create('workspace-1', makeIdentity(), [makeChannel()])

    expect(result.isOk()).toBe(true)
    const contact = result.getValue()
    expect(contact.status).toBe(ContactStatus.Active)
    expect(contact.workspaceId).toBe('workspace-1')
    expect(contact.channels).toHaveLength(1)
    expect(contact.domainEvents.some((e) => e.eventType === 'ContactCreated')).toBe(true)
  })

  it('rejects creation without channels', () => {
    const result = Contact.create('workspace-1', makeIdentity(), [])
    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('adds a new channel', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()
    const result = contact.addChannel(makeChannel(ChannelType.WhatsApp, '+5491112345678'))

    expect(result.isOk()).toBe(true)
    expect(contact.channels).toHaveLength(2)
  })

  it('rejects adding a duplicate channel', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()
    const result = contact.addChannel(makeChannel())

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
    expect(contact.channels).toHaveLength(1)
  })

  it('removes a channel when more than one remains', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()
    contact.addChannel(makeChannel(ChannelType.WhatsApp, '+5491112345678'))

    const result = contact.removeChannel(ChannelType.WhatsApp)

    expect(result.isOk()).toBe(true)
    expect(contact.channels).toHaveLength(1)
  })

  it('rejects removing the last remaining channel', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()

    const result = contact.removeChannel(ChannelType.Email)

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
    expect(contact.channels).toHaveLength(1)
  })

  it('updates identity and emits ContactUpdated', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()
    const newIdentity = ContactIdentity.create({ firstName: 'Grace' }).getValue()

    const result = contact.updateIdentity(newIdentity)

    expect(result.isOk()).toBe(true)
    expect(contact.identity.firstName).toBe('Grace')
    expect(contact.domainEvents.some((e) => e.eventType === 'ContactUpdated')).toBe(true)
  })

  it('opts out and emits ContactOptedOut', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()

    const result = contact.optOut()

    expect(result.isOk()).toBe(true)
    expect(contact.isOptedOut()).toBe(true)
    expect(contact.preferences.acceptsCampaigns).toBe('no')
    expect(contact.domainEvents.some((e) => e.eventType === 'ContactOptedOut')).toBe(true)
  })

  it('opts in after having opted out', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()
    contact.optOut()

    const result = contact.optIn()

    expect(result.isOk()).toBe(true)
    expect(contact.isOptedOut()).toBe(false)
    expect(contact.preferences.acceptsCampaigns).toBe('yes')
    expect(contact.domainEvents.some((e) => e.eventType === 'ContactOptedIn')).toBe(true)
  })

  it('rejects opting in without having opted out first', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()

    const result = contact.optIn()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it('archives from Active and emits ContactArchived', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()

    const result = contact.archive()

    expect(result.isOk()).toBe(true)
    expect(contact.status).toBe(ContactStatus.Archived)
    expect(contact.domainEvents.some((e) => e.eventType === 'ContactArchived')).toBe(true)
  })

  it('rejects archiving an already archived contact', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()
    contact.archive()

    const result = contact.archive()

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it('adds and removes tags without duplicates', () => {
    const contact = Contact.create('workspace-1', makeIdentity(), [makeChannel()]).getValue()

    contact.addTag('vip')
    contact.addTag('vip')
    expect(contact.tags).toEqual(['vip'])

    contact.removeTag('vip')
    expect(contact.tags).toEqual([])
  })
})
