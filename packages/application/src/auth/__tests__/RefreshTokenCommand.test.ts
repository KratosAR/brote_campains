import { UserId, WorkspaceId, UserRole, WorkspaceUser } from '@bcp/domain'
import { RefreshTokenCommand } from '../RefreshTokenCommand'
import { issueTokenPair } from '../security/issueTokenPair'
import { InMemoryWorkspaceUserRepository, InMemoryRefreshTokenRepository } from './testDoubles'

const SECRET = 'a'.repeat(32)

describe('RefreshTokenCommand', () => {
  async function seed() {
    const workspaceUserRepository = new InMemoryWorkspaceUserRepository()
    const refreshTokenRepository = new InMemoryRefreshTokenRepository()
    const userId = UserId.generate()
    workspaceUserRepository.memberships.push(
      WorkspaceUser.create({
        userId,
        workspaceId: WorkspaceId.generate(),
        role: UserRole.Admin,
        invitedAt: new Date(),
        joinedAt: new Date(),
      }),
    )
    const membership = workspaceUserRepository.memberships[0]!
    const tokens = await issueTokenPair({
      userId: userId.toString(),
      workspaceId: membership.workspaceId.toString(),
      role: membership.role,
      jwtSecret: SECRET,
      refreshTokenRepository,
    })
    return { workspaceUserRepository, refreshTokenRepository, tokens }
  }

  it('rotates the refresh token on use', async () => {
    const { workspaceUserRepository, refreshTokenRepository, tokens } = await seed()
    const command = new RefreshTokenCommand(refreshTokenRepository, workspaceUserRepository, SECRET)

    const result = await command.execute({ refreshToken: tokens.refreshToken })

    expect(result.isOk()).toBe(true)
    expect(result.getValue().refreshToken).not.toBe(tokens.refreshToken)
  })

  it('rejects a refresh token used twice', async () => {
    const { workspaceUserRepository, refreshTokenRepository, tokens } = await seed()
    const command = new RefreshTokenCommand(refreshTokenRepository, workspaceUserRepository, SECRET)

    const first = await command.execute({ refreshToken: tokens.refreshToken })
    const second = await command.execute({ refreshToken: tokens.refreshToken })

    expect(first.isOk()).toBe(true)
    expect(second.isFail()).toBe(true)
    expect(second.getError().code).toBe('UNAUTHORIZED')
  })

  it('rejects an unknown token', async () => {
    const { workspaceUserRepository, refreshTokenRepository } = await seed()
    const command = new RefreshTokenCommand(refreshTokenRepository, workspaceUserRepository, SECRET)

    const result = await command.execute({ refreshToken: 'not-a-real-token' })
    expect(result.isFail()).toBe(true)
  })
})
