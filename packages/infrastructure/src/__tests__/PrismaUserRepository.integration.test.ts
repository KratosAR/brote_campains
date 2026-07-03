import { PrismaClient } from '@prisma/client'

import { PrismaUserRepository } from '../persistence/PrismaUserRepository'

// ponytail: same DB-gated pattern as PrismaWorkspaceRepository.integration.test.ts —
// probes the real connection and no-ops per test when no DB is reachable.
describe('PrismaUserRepository (integration)', () => {
  const prisma = new PrismaClient()
  const repo = new PrismaUserRepository(prisma)
  let dbAvailable = true

  beforeAll(async () => {
    try {
      await prisma.$connect()
    } catch {
      dbAvailable = false
    }
  })

  afterEach(async () => {
    if (dbAvailable) await prisma.user.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makeUser(id: string, email: string) {
    return {
      id,
      email,
      passwordHash: 'hashed',
      name: 'Test User',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  it('saves and finds a user by id', async () => {
    if (!dbAvailable) return
    const user = makeUser('user-1', 'test@example.com')
    await repo.save(user)

    const result = await repo.findById('user-1')

    expect(result.isOk()).toBe(true)
    expect(result.getValue().email).toBe('test@example.com')
  })

  it('finds a user by email', async () => {
    if (!dbAvailable) return
    const user = makeUser('user-2', 'jane@example.com')
    await repo.save(user)

    const result = await repo.findByEmail('jane@example.com')

    expect(result.isOk()).toBe(true)
    expect(result.getValue().id).toBe('user-2')
  })

  it('returns NotFoundError for unknown email', async () => {
    if (!dbAvailable) return
    const result = await repo.findByEmail('nobody@example.com')
    expect(result.isFail()).toBe(true)
  })
})
