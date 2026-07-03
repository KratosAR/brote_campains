import { PrismaClient } from '@prisma/client'
import { Workspace, WorkspaceSettings } from '@bcp/domain'

import { PrismaWorkspaceRepository } from '../persistence/PrismaWorkspaceRepository'

// ponytail: needs a real Postgres reachable via DATABASE_URL (see prisma/schema.prisma).
// DATABASE_URL is always set (from .env), so we probe the actual connection instead of
// the env var and no-op each test when the DB isn't reachable — no DB service in this sandbox.
describe('PrismaWorkspaceRepository (integration)', () => {
  const prisma = new PrismaClient()
  const repo = new PrismaWorkspaceRepository(prisma)
  let dbAvailable = true

  beforeAll(async () => {
    try {
      await prisma.$connect()
    } catch {
      dbAvailable = false
    }
  })

  afterEach(async () => {
    if (dbAvailable) await prisma.workspace.deleteMany()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makeWorkspace(name: string) {
    const settings = WorkspaceSettings.create({
      timezone: 'America/Argentina/Cordoba',
      locale: 'es-AR',
      maxContacts: 1000,
      maxCampaigns: 10,
    }).getValue()
    return Workspace.create(name, settings, 'owner-1').getValue()
  }

  it('saves and finds a workspace by id', async () => {
    if (!dbAvailable) return
    const workspace = makeWorkspace('Acme Inc')
    await repo.save(workspace)

    const result = await repo.findById(workspace.workspaceId)

    expect(result.isOk()).toBe(true)
    expect(result.getValue().name).toBe('Acme Inc')
    expect(result.getValue().slug).toBe('acme-inc')
  })

  it('finds a workspace by slug', async () => {
    if (!dbAvailable) return
    const workspace = makeWorkspace('Beta Corp')
    await repo.save(workspace)

    const result = await repo.findBySlug('beta-corp')

    expect(result.isOk()).toBe(true)
    expect(result.getValue().workspaceId.equals(workspace.workspaceId)).toBe(true)
  })

  it('returns NotFoundError for unknown id', async () => {
    if (!dbAvailable) return
    const result = await repo.findById(Workspace.create('Ghost', makeWorkspace('x').settings, 'o').getValue().workspaceId)
    expect(result.isFail()).toBe(true)
  })

  it('existsBySlug reflects persisted state', async () => {
    if (!dbAvailable) return
    const workspace = makeWorkspace('Gamma LLC')
    expect(await repo.existsBySlug('gamma-llc')).toBe(false)
    await repo.save(workspace)
    expect(await repo.existsBySlug('gamma-llc')).toBe(true)
  })

  it('persists status transitions', async () => {
    if (!dbAvailable) return
    const workspace = makeWorkspace('Delta Co')
    workspace.activate()
    await repo.save(workspace)

    const result = await repo.findById(workspace.workspaceId)
    expect(result.getValue().status).toBe('Active')
  })
})
