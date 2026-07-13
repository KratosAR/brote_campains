import { ChannelType } from '@bcp/domain'
import { CreateContactCommand } from '../CreateContactCommand'
import { InMemoryContactRepository, NoopEventBus } from './testDoubles'

function makeCommand() {
  const contactRepository = new InMemoryContactRepository()
  const eventBus = new NoopEventBus()
  const command = new CreateContactCommand(contactRepository, eventBus)
  return { command, contactRepository, eventBus }
}

describe('CreateContactCommand', () => {
  it('creates a contact with identity and channels', async () => {
    const { command, contactRepository, eventBus } = makeCommand()

    const result = await command.execute({
      workspaceId: 'ws-1',
      identity: { firstName: 'Ada', lastName: 'Lovelace' },
      channels: [{ type: ChannelType.Email, value: 'ada@example.com' }],
      tags: ['vip'],
    })

    expect(result.isOk()).toBe(true)
    expect(contactRepository.contacts.size).toBe(1)
    expect(eventBus.published).toHaveLength(1)
    const contact = [...contactRepository.contacts.values()][0]!
    expect(contact.tags).toEqual(['vip'])
  })

  it('rejects a contact without channels', async () => {
    const { command } = makeCommand()

    const result = await command.execute({
      workspaceId: 'ws-1',
      identity: { firstName: 'Ada' },
      channels: [],
    })

    expect(result.isFail()).toBe(true)
  })
})
