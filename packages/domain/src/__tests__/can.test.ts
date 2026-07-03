import { can } from '../auth/can'
import { WorkspaceUser } from '../auth/WorkspaceUser'
import { UserRole } from '../auth/UserRole'
import { Permission } from '../auth/Permission'
import { UserId } from '../auth/UserId'
import { WorkspaceId } from '../workspace/WorkspaceId'

function makeUser(role: UserRole): WorkspaceUser {
  return WorkspaceUser.create({
    userId: UserId.generate(),
    workspaceId: WorkspaceId.generate(),
    role,
    invitedAt: new Date(),
  })
}

describe('can', () => {
  it('Owner has every permission', () => {
    const owner = makeUser(UserRole.Owner)
    expect(can(owner, Permission.WorkspaceTransfer)).toBe(true)
    expect(can(owner, Permission.CampaignExecute)).toBe(true)
  })

  it('Admin cannot transfer the workspace', () => {
    const admin = makeUser(UserRole.Admin)
    expect(can(admin, Permission.WorkspaceTransfer)).toBe(false)
    expect(can(admin, Permission.CampaignDelete)).toBe(true)
  })

  it('Viewer can only view campaigns', () => {
    const viewer = makeUser(UserRole.Viewer)
    expect(can(viewer, Permission.CampaignView)).toBe(true)
    expect(can(viewer, Permission.CampaignExecute)).toBe(false)
  })

  it('Operator can execute campaigns but not delete them', () => {
    const operator = makeUser(UserRole.Operator)
    expect(can(operator, Permission.CampaignExecute)).toBe(true)
    expect(can(operator, Permission.CampaignDelete)).toBe(false)
  })
})
