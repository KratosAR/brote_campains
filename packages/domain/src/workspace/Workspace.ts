import { AggregateRoot } from '../shared/AggregateRoot'
import { Result } from '../shared/Result'
import { BusinessRuleViolationError, ValidationError } from '../shared/errors/DomainError'
import { WorkspaceId } from './WorkspaceId'
import { WorkspaceStatus } from './WorkspaceStatus'
import { WorkspaceSettings } from './WorkspaceSettings'
import { WorkspaceCreated, WorkspaceSuspended, WorkspaceArchived } from './events/WorkspaceEvents'

interface WorkspaceProps {
  name: string
  slug: string
  status: WorkspaceStatus
  settings: WorkspaceSettings
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export class Workspace extends AggregateRoot<WorkspaceProps> {
  private constructor(props: WorkspaceProps, id?: WorkspaceId, createdAt?: Date) {
    super(props, id, createdAt)
  }

  static create(
    name: string,
    settings: WorkspaceSettings,
    ownerId: string,
  ): Result<Workspace, ValidationError> {
    if (!name || name.trim().length === 0) {
      return Result.fail(new ValidationError('Workspace name cannot be empty', 'name'))
    }

    const workspace = new Workspace({
      name: name.trim(),
      slug: slugify(name),
      status: WorkspaceStatus.Creating,
      settings,
    })

    workspace.addDomainEvent(
      new WorkspaceCreated(workspace.id.toString(), workspace.id.toString(), workspace.name, ownerId),
    )

    return Result.ok(workspace)
  }

  static hydrate(props: WorkspaceProps, id: WorkspaceId, createdAt: Date, updatedAt: Date): Workspace {
    const workspace = new Workspace(props, id, createdAt)
    workspace.updatedAt = updatedAt
    return workspace
  }

  get workspaceId(): WorkspaceId {
    return this._id as WorkspaceId
  }

  get name(): string {
    return this.props.name
  }

  get slug(): string {
    return this.props.slug
  }

  get status(): WorkspaceStatus {
    return this.props.status
  }

  get settings(): WorkspaceSettings {
    return this.props.settings
  }

  activate(): Result<void, BusinessRuleViolationError> {
    if (this.props.status !== WorkspaceStatus.Creating) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot activate a workspace from status "${this.props.status}"`,
          'workspace.activate.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: WorkspaceStatus.Active }
    return Result.ok(undefined)
  }

  suspend(reason: string): Result<void, BusinessRuleViolationError> {
    if (this.props.status !== WorkspaceStatus.Active) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot suspend a workspace from status "${this.props.status}"`,
          'workspace.suspend.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: WorkspaceStatus.Suspended }
    this.addDomainEvent(new WorkspaceSuspended(this.id.toString(), this.id.toString(), reason))
    return Result.ok(undefined)
  }

  archive(): Result<void, BusinessRuleViolationError> {
    if (this.props.status !== WorkspaceStatus.Suspended) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot archive a workspace from status "${this.props.status}"`,
          'workspace.archive.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: WorkspaceStatus.Archived }
    this.addDomainEvent(new WorkspaceArchived(this.id.toString(), this.id.toString()))
    return Result.ok(undefined)
  }
}
