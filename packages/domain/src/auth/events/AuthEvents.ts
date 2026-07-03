import { DomainEvent } from '../../shared/DomainEvent'
import { UserRole } from '../UserRole'

export class UserInvited extends DomainEvent {
  readonly eventType = 'UserInvited'
  readonly aggregateType = 'Workspace'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    readonly userId: string,
    readonly email: string,
    readonly role: UserRole,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class UserJoined extends DomainEvent {
  readonly eventType = 'UserJoined'
  readonly aggregateType = 'Workspace'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    readonly userId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class UserRoleChanged extends DomainEvent {
  readonly eventType = 'UserRoleChanged'
  readonly aggregateType = 'Workspace'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    readonly userId: string,
    readonly oldRole: UserRole,
    readonly newRole: UserRole,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}

export class UserRemoved extends DomainEvent {
  readonly eventType = 'UserRemoved'
  readonly aggregateType = 'Workspace'

  constructor(
    readonly aggregateId: string,
    readonly workspaceId: string,
    readonly userId: string,
    correlationId?: string,
  ) {
    super(correlationId)
  }
}
