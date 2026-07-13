import { Contact, ContactIdentity, ContactChannel, ChannelType } from '@bcp/domain'

import { ContactMapper, type ContactRecord } from '../persistence/ContactMapper'

function makeContact(): Contact {
  const identity = ContactIdentity.create({ firstName: 'Ada', lastName: 'Lovelace' }).getValue()
  const channel = ContactChannel.create(ChannelType.Email, 'ada@example.com').getValue()
  return Contact.create('workspace-1', identity, [channel]).getValue()
}

describe('ContactMapper', () => {
  it('round-trips a contact through toPersistence/toDomain', () => {
    const contact = makeContact()
    contact.addTag('vip')

    const { contact: data, channels, tags } = ContactMapper.toPersistence(contact)

    const record: ContactRecord = {
      ...data,
      channels: channels.map((c) => ({ ...c, createdAt: new Date() })),
      tags,
    }

    const hydrated = ContactMapper.toDomain(record)

    expect(hydrated.identity.firstName).toBe('Ada')
    expect(hydrated.identity.lastName).toBe('Lovelace')
    expect(hydrated.channels).toHaveLength(1)
    expect(hydrated.channels[0]?.value).toBe('ada@example.com')
    expect(hydrated.tags).toEqual(['vip'])
    expect(hydrated.workspaceId).toBe('workspace-1')
    expect(hydrated.preferences.acceptsCampaigns).toBe('unknown')
  })
})
