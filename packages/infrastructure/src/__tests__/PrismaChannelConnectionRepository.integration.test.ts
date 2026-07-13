import { PrismaClient } from '@prisma/client'
import { ChannelConnection, ChannelConnectionId, ChannelType } from '@bcp/domain'

import { PrismaChannelConnectionRepository } from '../persistence/PrismaChannelConnectionRepository'
import { CredentialEncryption } from '../security/CredentialEncryption'

// ponytail: needs a real Postgres reachable via DATABASE_URL (see prisma/schema.prisma).
// Same probe-and-no-op pattern as PrismaDeliveryRepository.integration.test.ts — no DB
// service in this sandbox.
describe('PrismaChannelConnectionRepository (integration)', () => {
  const prisma = new PrismaClient()
  const encryption = new CredentialEncryption('integration-test-key')
  const repo = new PrismaChannelConnectionRepository(prisma, encryption)
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
    if (dbAvailable) await prisma.channelConnection.deleteMany({ where: { workspaceId } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makeConnection(): ChannelConnection {
    return ChannelConnection.create(workspaceId, ChannelType.WhatsApp, 'evolution-provider', { token: 'x' }, 1).getValue()
  }

  it('saves and finds a connection by id, with credentials encrypted at rest', async () => {
    if (!dbAvailable) return
    const connection = makeConnection()
    await repo.save(connection)

    const raw = await prisma.channelConnection.findFirst({ where: { workspaceId } })
    expect(raw?.credentialsEncrypted).not.toContain('token')

    const result = await repo.findById(connection.connectionId, workspaceId)
    expect(result.isOk()).toBe(true)
    expect(result.getValue().credentials).toEqual({ token: 'x' })
  })

  it('returns NotFoundError for unknown id', async () => {
    if (!dbAvailable) return
    const result = await repo.findById(ChannelConnectionId.generate(), workspaceId)
    expect(result.isFail()).toBe(true)
  })

  it('finds by channel', async () => {
    if (!dbAvailable) return
    await repo.save(makeConnection())
    const found = await repo.findByChannel(workspaceId, ChannelType.WhatsApp)
    expect(found).toHaveLength(1)
  })
})
