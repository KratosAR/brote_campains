import { ChannelType, ContactStatus } from '@bcp/domain'
import { CreateContactCommand } from '../CreateContactCommand'
import { ArchiveContactCommand } from '../ArchiveContactCommand'
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

describe('ArchiveContactCommand', () => {
  it('archives an active contact', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const contactId = await makeContact(contactRepository, eventBus)
    const command = new ArchiveContactCommand(contactRepository, eventBus)

    const result = await command.execute({ contactId, workspaceId: 'ws-1' })

    expect(result.isOk()).toBe(true)
    expect(contactRepository.contacts.get(contactId)!.status).toBe(ContactStatus.Archived)
  })

  it('fails to archive an already archived contact', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const contactId = await makeContact(contactRepository, eventBus)
    const command = new ArchiveContactCommand(contactRepository, eventBus)

    await command.execute({ contactId, workspaceId: 'ws-1' })
    const second = await command.execute({ contactId, workspaceId: 'ws-1' })

    expect(second.isFail()).toBe(true)
  })
})
