import { ChannelType } from '@bcp/domain'
import { CreateContactCommand } from '../CreateContactCommand'
import { UpdateContactCommand } from '../UpdateContactCommand'
import { InMemoryContactRepository, NoopEventBus } from './testDoubles'

async function makeContact(contactRepository: InMemoryContactRepository, eventBus: NoopEventBus) {
  const createCommand = new CreateContactCommand(contactRepository, eventBus)
  const result = await createCommand.execute({
    workspaceId: 'ws-1',
    identity: { firstName: 'Ada' },
    channels: [{ type: ChannelType.Email, value: 'ada@example.com' }],
  })
  return result.getValue().contactId
}

describe('UpdateContactCommand', () => {
  it('updates identity and adds a channel', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const contactId = await makeContact(contactRepository, eventBus)
    const command = new UpdateContactCommand(contactRepository, eventBus)

    const result = await command.execute({
      contactId,
      workspaceId: 'ws-1',
      identity: { firstName: 'Ada', lastName: 'Lovelace' },
      channels: [{ type: ChannelType.SMS, value: '+14155552671' }],
      tags: ['vip'],
    })

    expect(result.isOk()).toBe(true)
    const updated = contactRepository.contacts.get(contactId)!
    expect(updated.identity.lastName).toBe('Lovelace')
    expect(updated.channels).toHaveLength(2)
    expect(updated.tags).toEqual(['vip'])
  })

  it('fails when contact does not exist', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const command = new UpdateContactCommand(contactRepository, eventBus)

    const result = await command.execute({
      contactId: 'missing',
      workspaceId: 'ws-1',
      identity: { firstName: 'Ada' },
    })

    expect(result.isFail()).toBe(true)
  })
})
