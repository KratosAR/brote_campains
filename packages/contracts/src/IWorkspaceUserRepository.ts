import { WorkspaceUser, Result, NotFoundError, DomainError } from '@bcp/domain'

export interface IWorkspaceUserRepository {
  findByUserAndWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<Result<WorkspaceUser, NotFoundError>>
  // ponytail: returns the first membership found; multi-workspace switching
  // at login is out of scope for Sprint 2.
  findByUserId(userId: string): Promise<Result<WorkspaceUser, NotFoundError>>
  save(workspaceUser: WorkspaceUser): Promise<Result<void, DomainError>>
}
