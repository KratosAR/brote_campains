import { PrismaClient } from '@prisma/client'
import { Template, TemplateContent, ChannelType, TemplateId } from '@bcp/domain'

import { PrismaTemplateRepository } from '../persistence/PrismaTemplateRepository'

// ponytail: needs a real Postgres reachable via DATABASE_URL (see prisma/schema.prisma).
// Same probe-and-no-op pattern as PrismaContactRepository.integration.test.ts — no DB
// service in this sandbox.
describe('PrismaTemplateRepository (integration)', () => {
  const prisma = new PrismaClient()
  const repo = new PrismaTemplateRepository(prisma)
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
    if (dbAvailable) await prisma.template.deleteMany({ where: { workspaceId } })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  function makeTemplate(name: string): Template {
    const content = TemplateContent.create('Hi {{name}}').getValue()
    return Template.create(workspaceId, name, ChannelType.Email, content).getValue()
  }

  it('saves and finds a template by id', async () => {
    if (!dbAvailable) return
    const template = makeTemplate('Welcome')
    await repo.save(template)

    const result = await repo.findById(template.templateId, workspaceId)

    expect(result.isOk()).toBe(true)
    expect(result.getValue().name).toBe('Welcome')
    expect(result.getValue().versions).toHaveLength(1)
  })

  it('returns NotFoundError for unknown id', async () => {
    if (!dbAvailable) return
    const result = await repo.findById(TemplateId.generate(), workspaceId)
    expect(result.isFail()).toBe(true)
  })

  it('saves new versions without touching existing ones', async () => {
    if (!dbAvailable) return
    const template = makeTemplate('Reminder')
    await repo.save(template)

    template.createVersion(TemplateContent.create('Hi {{name}}, v2').getValue())
    await repo.save(template)

    const result = await repo.findById(template.templateId, workspaceId)
    expect(result.getValue().versions).toHaveLength(2)
  })

  it('lists templates with channel/status filters and pagination', async () => {
    if (!dbAvailable) return
    await repo.save(makeTemplate('A'))
    await repo.save(makeTemplate('B'))

    const page = await repo.list(workspaceId, { channel: ChannelType.Email }, { page: 1, limit: 10 })

    expect(page.total).toBe(2)
  })
})
