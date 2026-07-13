import { PrismaClient } from '@prisma/client'
import { Contact, ContactIdentity, ContactChannel, ChannelType, ContactId } from '@bcp/domain'

import { PrismaContactRepository } from '../persistence/PrismaContactRepository'

// ponytail: needs a real Postgres reachable via DATABASE_URL (see prisma/schema.prisma).
// Same probe-and-no-op pattern as PrismaWorkspaceRepository.integration.test.ts — no DB
// service in this sandbox.
describe('PrismaContactRepository (integration)', () => {
  const prisma = new PrismaClient()
  const repo = new PrismaContactRepository(prisma)
  const workspaceId = 'workspace-1'
  let dbAvailable = true

  beforeAll(async () => {
    try {
      await prisma.$connect()
    } catch {
      dbAvailable = false
    }
  })

  afterEach(async () => {
    if (dbAvailable) await prisma.contact.deleteMany({ where: { workspaceId } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makeContact(firstName: string, email: string): Contact {
    const identity = ContactIdentity.create({ firstName, externalId: `ext-${firstName}` }).getValue()
    const channel = ContactChannel.create(ChannelType.Email, email).getValue()
    return Contact.create(workspaceId, identity, [channel]).getValue()
  }

  it('saves and finds a contact by id', async () => {
    if (!dbAvailable) return
    const contact = makeContact('Ada', 'ada@example.com')
    await repo.save(contact)

    const result = await repo.findById(contact.contactId, workspaceId)

    expect(result.isOk()).toBe(true)
    expect(result.getValue().identity.firstName).toBe('Ada')
  })

  it('finds a contact by channel', async () => {
    if (!dbAvailable) return
    const contact = makeContact('Grace', 'grace@example.com')
    await repo.save(contact)

    const result = await repo.findByChannel('Email', 'grace@example.com', workspaceId)

    expect(result.isOk()).toBe(true)
    expect(result.getValue().contactId.equals(contact.contactId)).toBe(true)
  })

  it('finds a contact by externalId', async () => {
    if (!dbAvailable) return
    const contact = makeContact('Alan', 'alan@example.com')
    await repo.save(contact)

    const result = await repo.findByExternalId('ext-Alan', workspaceId)

    expect(result.isOk()).toBe(true)
  })

  it('returns NotFoundError for unknown id', async () => {
    if (!dbAvailable) return
    const result = await repo.findById(ContactId.generate(), workspaceId)
    expect(result.isFail()).toBe(true)
  })

  it('searches contacts with q filter and pagination', async () => {
    if (!dbAvailable) return
    await repo.save(makeContact('Ada', 'ada2@example.com'))
    await repo.save(makeContact('Bert', 'bert@example.com'))

    const page = await repo.search(workspaceId, { q: 'Ada' }, { page: 1, limit: 10 })

    expect(page.total).toBe(1)
    expect(page.items[0]?.identity.firstName).toBe('Ada')
  })

  it('counts contacts by workspace', async () => {
    if (!dbAvailable) return
    await repo.save(makeContact('Ada', 'ada3@example.com'))
    await repo.save(makeContact('Bert', 'bert2@example.com'))

    expect(await repo.countByWorkspace(workspaceId)).toBe(2)
  })

  it('saveBatch persists multiple contacts in one transaction', async () => {
    if (!dbAvailable) return
    const contacts = [makeContact('One', 'one@example.com'), makeContact('Two', 'two@example.com')]

    await repo.saveBatch(contacts)

    expect(await repo.countByWorkspace(workspaceId)).toBe(2)
  })
})
