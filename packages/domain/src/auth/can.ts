import { WorkspaceUser } from './WorkspaceUser'
import { Permission } from './Permission'
import { RolePermissions } from './RolePermissions'

export function can(user: WorkspaceUser, permission: Permission): boolean {
  return RolePermissions[user.role].includes(permission)
}
