import { ChannelType } from '@bcp/domain'
import { CreateContactCommand } from '../CreateContactCommand'
import { OptOutContactCommand } from '../OptOutContactCommand'
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

describe('OptOutContactCommand', () => {
  it('opts out a contact', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const contactId = await makeContact(contactRepository, eventBus)
    const command = new OptOutContactCommand(contactRepository, eventBus)

    const result = await command.execute({ contactId, workspaceId: 'ws-1' })

    expect(result.isOk()).toBe(true)
    expect(contactRepository.contacts.get(contactId)!.isOptedOut()).toBe(true)
  })

  it('is idempotent-safe: opting out twice still succeeds (domain allows re-opt-out)', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const contactId = await makeContact(contactRepository, eventBus)
    const command = new OptOutContactCommand(contactRepository, eventBus)

    await command.execute({ contactId, workspaceId: 'ws-1' })
    const second = await command.execute({ contactId, workspaceId: 'ws-1' })

    // ponytail: Contact.optOut() no rechaza doble opt-out (solo optIn() valida estado previo).
    // Si el dominio agrega esa regla, este test debe cambiar a expect(second.isFail()).toBe(true).
    expect(second.isOk()).toBe(true)
  })

  it('fails when contact does not exist', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const command = new OptOutContactCommand(contactRepository, eventBus)

    const result = await command.execute({ contactId: 'missing', workspaceId: 'ws-1' })

    expect(result.isFail()).toBe(true)
  })
})
