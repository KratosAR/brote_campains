import { UserId, WorkspaceId, UserRole, WorkspaceUser } from '@bcp/domain'
import { InviteUserCommand } from '../InviteUserCommand'
import { AcceptInvitationCommand } from '../AcceptInvitationCommand'
import {
  InMemoryUserRepository,
  InMemoryWorkspaceUserRepository,
  InMemoryInvitationRepository,
  InMemoryRefreshTokenRepository,
  NoopEventBus,
} from './testDoubles'

const SECRET = 'a'.repeat(32)

function makeInviter(workspaceUserRepository: InMemoryWorkspaceUserRepository, workspaceId: WorkspaceId) {
  const ownerId = UserId.generate()
  workspaceUserRepository.memberships.push(
    WorkspaceUser.create({
      userId: ownerId,
      workspaceId,
      role: UserRole.Owner,
      invitedAt: new Date(),
      joinedAt: new Date(),
    }),
  )
  return ownerId
}

describe('InviteUserCommand + AcceptInvitationCommand', () => {
  it('invites a user and lets them accept to join the workspace', async () => {
    const userRepository = new InMemoryUserRepository()
    const workspaceUserRepository = new InMemoryWorkspaceUserRepository()
    const invitationRepository = new InMemoryInvitationRepository()
    const refreshTokenRepository = new InMemoryRefreshTokenRepository()
    const eventBus = new NoopEventBus()

    const workspaceId = WorkspaceId.generate()
    const ownerId = makeInviter(workspaceUserRepository, workspaceId)

    const invite = new InviteUserCommand(
      userRepository,
      workspaceUserRepository,
      invitationRepository,
      eventBus,
    )
    const inviteResult = await invite.execute({
      workspaceId: workspaceId.toString(),
      email: 'newbie@example.com',
      role: UserRole.Operator,
      invitedByUserId: ownerId.toString(),
    })
    expect(inviteResult.isOk()).toBe(true)
    expect(eventBus.published).toHaveLength(1)

    const accept = new AcceptInvitationCommand(
      userRepository,
      workspaceUserRepository,
      invitationRepository,
      refreshTokenRepository,
      eventBus,
      SECRET,
    )
    const acceptResult = await accept.execute({
      token: inviteResult.getValue().invitationToken,
      name: 'Newbie',
      password: 'Super@Secret1',
    })

    expect(acceptResult.isOk()).toBe(true)
    expect(workspaceUserRepository.memberships).toHaveLength(2)
    expect(eventBus.published).toHaveLength(2)
  })

  it('rejects invitations from a non-admin member', async () => {
    const userRepository = new InMemoryUserRepository()
    const workspaceUserRepository = new InMemoryWorkspaceUserRepository()
    const invitationRepository = new InMemoryInvitationRepository()
    const eventBus = new NoopEventBus()

    const workspaceId = WorkspaceId.generate()
    const viewerId = UserId.generate()
    workspaceUserRepository.memberships.push(
      WorkspaceUser.create({
        userId: viewerId,
        workspaceId,
        role: UserRole.Viewer,
        invitedAt: new Date(),
        joinedAt: new Date(),
      }),
    )

    const invite = new InviteUserCommand(
      userRepository,
      workspaceUserRepository,
      invitationRepository,
      eventBus,
    )
    const result = await invite.execute({
      workspaceId: workspaceId.toString(),
      email: 'newbie@example.com',
      role: UserRole.Operator,
      invitedByUserId: viewerId.toString(),
    })

    expect(result.isFail()).toBe(true)
    expect(result.getError().code).toBe('UNAUTHORIZED')
  })

  it('rejects reusing an already-accepted invitation token', async () => {
    const userRepository = new InMemoryUserRepository()
    const workspaceUserRepository = new InMemoryWorkspaceUserRepository()
    const invitationRepository = new InMemoryInvitationRepository()
    const refreshTokenRepository = new InMemoryRefreshTokenRepository()
    const eventBus = new NoopEventBus()

    const workspaceId = WorkspaceId.generate()
    const ownerId = makeInviter(workspaceUserRepository, workspaceId)

    const invite = new InviteUserCommand(userRepository, workspaceUserRepository, invitationRepository, eventBus)
    const inviteResult = await invite.execute({
      workspaceId: workspaceId.toString(),
      email: 'newbie2@example.com',
      role: UserRole.Viewer,
      invitedByUserId: ownerId.toString(),
    })

    const accept = new AcceptInvitationCommand(
      userRepository,
      workspaceUserRepository,
      invitationRepository,
      refreshTokenRepository,
      eventBus,
      SECRET,
    )
    const token = inviteResult.getValue().invitationToken
    const first = await accept.execute({ token, name: 'Newbie', password: 'Super@Secret1' })
    const second = await accept.execute({ token, name: 'Newbie', password: 'Super@Secret1' })

    expect(first.isOk()).toBe(true)
    expect(second.isFail()).toBe(true)
  })
})
