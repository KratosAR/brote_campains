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

export { ContactId } from './contact/ContactId'
export { ContactStatus } from './contact/ContactStatus'
export { ChannelType } from './contact/ChannelType'
export { ContactChannel } from './contact/ContactChannel'
export { ContactIdentity } from './contact/ContactIdentity'
export { ContactPreferences, type AcceptsCampaigns } from './contact/ContactPreferences'
export { Contact } from './contact/Contact'
export { GroupId } from './contact/GroupId'
export { ContactGroup } from './contact/ContactGroup'
export {
  ContactCreated,
  ContactUpdated,
  ContactOptedOut,
  ContactOptedIn,
  ContactArchived,
  ContactsImported,
} from './contact/events/ContactEvents'

export { TemplateId } from './template/TemplateId'
export { TemplateStatus } from './template/TemplateStatus'
export { TemplateVariable } from './template/TemplateVariable'
export { TemplateContent } from './template/TemplateContent'
export { TemplateVersion } from './template/TemplateVersion'
export { Template } from './template/Template'
export { resolve as resolveTemplateVariables } from './template/VariableResolver'

export { CampaignId } from './campaign/CampaignId'
export { CampaignStatus } from './campaign/CampaignStatus'
export { CampaignAudience, type CampaignAudienceType } from './campaign/CampaignAudience'
export { CampaignSchedule } from './campaign/CampaignSchedule'
export { DeliveryPolicy } from './campaign/DeliveryPolicy'
export { CampaignStatistics, type CampaignStatisticsProps } from './campaign/CampaignStatistics'
export { CampaignTimelineEntry } from './campaign/CampaignTimelineEntry'
export { Campaign } from './campaign/Campaign'
export {
  CampaignCreated,
  CampaignScheduled,
  CampaignStarted,
  CampaignPaused,
  CampaignResumed,
  CampaignCancelled,
  CampaignCompleted,
  CampaignArchived,
} from './campaign/events/CampaignEvents'
export {
  CampaignHasAudience,
  CampaignHasValidSchedule,
  CampaignCanStart,
} from './campaign/specifications/CampaignSpecifications'

export { DeliveryId } from './delivery/DeliveryId'
export { DeliveryStatus } from './delivery/DeliveryStatus'
export { DeliveryAttempt } from './delivery/DeliveryAttempt'
export { Delivery } from './delivery/Delivery'
export { DeliveryQueued, DeliveryFailed, DeliveryCompleted, DeliveryExpired } from './delivery/events/DeliveryEvents'

export { ChannelConnectionId } from './channel/ChannelConnectionId'
export { ConnectionStatus } from './channel/ConnectionStatus'
export { ChannelConnection } from './channel/ChannelConnection'
