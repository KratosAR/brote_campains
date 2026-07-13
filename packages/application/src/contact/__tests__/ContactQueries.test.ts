import { ChannelType } from '@bcp/domain'
import { CreateContactCommand } from '../CreateContactCommand'
import { SearchContactsQuery } from '../SearchContactsQuery'
import { GetContactQuery } from '../GetContactQuery'
import { InMemoryContactRepository, NoopEventBus } from './testDoubles'

describe('SearchContactsQuery / GetContactQuery', () => {
  it('finds a created contact by id and via search', async () => {
    const contactRepository = new InMemoryContactRepository()
    const eventBus = new NoopEventBus()
    const create = new CreateContactCommand(contactRepository, eventBus)
    const { contactId } = (
      await create.execute({
        workspaceId: 'ws-1',
        identity: { firstName: 'Ada' },
        channels: [{ type: ChannelType.Email, value: 'ada@example.com' }],
      })
    ).getValue()

    const getQuery = new GetContactQuery(contactRepository)
    const getResult = await getQuery.execute({ contactId, workspaceId: 'ws-1' })
    expect(getResult.isOk()).toBe(true)

    const searchQuery = new SearchContactsQuery(contactRepository)
    const page = await searchQuery.execute({ workspaceId: 'ws-1', page: 1, limit: 10 })
    expect(page.total).toBe(1)
    expect(page.items[0]!.contactId.toString()).toBe(contactId)
  })

  it('returns a NotFoundError for a missing contact', async () => {
    const contactRepository = new InMemoryContactRepository()
    const getQuery = new GetContactQuery(contactRepository)

    const result = await getQuery.execute({ contactId: 'missing', workspaceId: 'ws-1' })

    expect(result.isFail()).toBe(true)
  })
})
