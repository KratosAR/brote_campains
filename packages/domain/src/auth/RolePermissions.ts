import { UserRole } from './UserRole'
import { Permission } from './Permission'

const ALL_PERMISSIONS: Permission[] = Object.values(Permission)

const OPERATOR_PERMISSIONS: Permission[] = [
  Permission.CampaignCreate,
  Permission.CampaignUpdate,
  Permission.CampaignExecute,
  Permission.CampaignPause,
  Permission.CampaignResume,
  Permission.CampaignView,
  Permission.ContactImport,
  Permission.ContactExport,
]

const VIEWER_PERMISSIONS: Permission[] = [Permission.CampaignView]

export const RolePermissions: Readonly<Record<UserRole, Permission[]>> = {
  [UserRole.Owner]: ALL_PERMISSIONS,
  [UserRole.Admin]: ALL_PERMISSIONS.filter((p) => p !== Permission.WorkspaceTransfer),
  [UserRole.Operator]: OPERATOR_PERMISSIONS,
  [UserRole.Viewer]: VIEWER_PERMISSIONS,
}
