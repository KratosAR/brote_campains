import type { Workspace as PrismaWorkspace } from '@prisma/client'
import { Workspace, WorkspaceSettings } from '@bcp/domain'

import { WorkspaceMapper } from '../persistence/WorkspaceMapper'

describe('WorkspaceMapper', () => {
  it('round-trips a workspace through persistence shape', () => {
    const settings = WorkspaceSettings.create({
      timezone: 'America/Argentina/Cordoba',
      locale: 'es-AR',
      maxContacts: 500,
      maxCampaigns: 5,
    }).getValue()
    const workspace = Workspace.create('My Workspace', settings, 'owner-1').getValue()

    const record = WorkspaceMapper.toPersistence(workspace)
    const rebuilt = WorkspaceMapper.toDomain(record as PrismaWorkspace)

    expect(rebuilt.name).toBe(workspace.name)
    expect(rebuilt.slug).toBe(workspace.slug)
    expect(rebuilt.status).toBe(workspace.status)
    expect(rebuilt.settings.timezone).toBe(settings.timezone)
    expect(rebuilt.workspaceId.equals(workspace.workspaceId)).toBe(true)
    expect(rebuilt.domainEvents).toHaveLength(0)
  })
})
