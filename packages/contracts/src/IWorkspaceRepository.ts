import { Result, Workspace, WorkspaceId, NotFoundError } from '@bcp/domain'

import { IRepository } from './IRepository'

export interface IWorkspaceRepository extends IRepository<Workspace, WorkspaceId> {
  findBySlug(slug: string): Promise<Result<Workspace, NotFoundError>>
  existsBySlug(slug: string): Promise<boolean>
}
