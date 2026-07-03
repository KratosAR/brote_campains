import { DomainEvent } from '../../shared/DomainEvent'

export class WorkspaceCreated extends DomainEvent {
  readonly eventType = 'WorkspaceCreated'
  readonly aggregateType = 'Workspace'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    readonly name: string,
    readonly ownerId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class WorkspaceSuspended extends DomainEvent {
  readonly eventType = 'WorkspaceSuspended'
  readonly aggregateType = 'Workspace'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    readonly reason: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class WorkspaceArchived extends DomainEvent {
  readonly eventType = 'WorkspaceArchived'
  readonly aggregateType = 'Workspace'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}
