import type { Workspace as PrismaWorkspace } from '@prisma/client'
import { Workspace, WorkspaceId, WorkspaceStatus, WorkspaceSettings } from '@bcp/domain'

export const WorkspaceMapper = {
  toDomain(record: PrismaWorkspace): Workspace {
    const settings = WorkspaceSettings.create({
      timezone: record.timezone,
      locale: record.locale,
      maxContacts: record.maxContacts,
      maxCampaigns: record.maxCampaigns,
    }).getValue()

    return Workspace.hydrate(
      { name: record.name, slug: record.slug, status: record.status as WorkspaceStatus, settings },
      WorkspaceId.from(record.id),
      record.createdAt,
      record.updatedAt,
    )
  },

  toPersistence(workspace: Workspace): PrismaWorkspace {
    return {
      id: workspace.id.toString(),
      name: workspace.name,
      slug: workspace.slug,
      status: workspace.status,
      timezone: workspace.settings.timezone,
      locale: workspace.settings.locale,
      maxContacts: workspace.settings.maxContacts,
      maxCampaigns: workspace.settings.maxCampaigns,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    }
  },
}
