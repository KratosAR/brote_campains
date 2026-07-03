export { UniqueId } from './shared/UniqueId'
export { IClock, SystemClock, FixedClock } from './shared/Clock'
export { Result } from './shared/Result'
export { ValueObject } from './shared/ValueObject'
export { Entity } from './shared/Entity'
export { AggregateRoot } from './shared/AggregateRoot'
export { DomainEvent } from './shared/DomainEvent'
export { Specification, AndSpecification, OrSpecification, NotSpecification } from './shared/Specification'
export {
  DomainError,
  ValidationError,
  NotFoundError,
  BusinessRuleViolationError,
  UnauthorizedError,
} from './shared/errors/DomainError'
export { Email } from './shared/value-objects/Email'
export { PhoneNumber } from './shared/value-objects/PhoneNumber'

export { WorkspaceId } from './workspace/WorkspaceId'
export { WorkspaceStatus } from './workspace/WorkspaceStatus'
export { WorkspaceSettings } from './workspace/WorkspaceSettings'
export { Workspace } from './workspace/Workspace'
export {
  WorkspaceCreated,
  WorkspaceSuspended,
  WorkspaceArchived,
} from './workspace/events/WorkspaceEvents'

export { UserId } from './auth/UserId'
export { UserRole } from './auth/UserRole'
export { Permission } from './auth/Permission'
export { RolePermissions } from './auth/RolePermissions'
export { WorkspaceUser } from './auth/WorkspaceUser'
export { can } from './auth/can'
export { UserInvited, UserJoined, UserRoleChanged, UserRemoved } from './auth/events/AuthEvents'
