import { UserId, WorkspaceId, UserRole } from '@bcp/domain'
import { RevokeSessionCommand } from '../RevokeSessionCommand'
import { issueTokenPair } from '../security/issueTokenPair'
import { InMemoryRefreshTokenRepository } from './testDoubles'

const SECRET = 'a'.repeat(32)

describe('RevokeSessionCommand', () => {
  it('revokes the matching refresh token for the user', async () => {
    const refreshTokenRepository = new InMemoryRefreshTokenRepository()
    const userId = UserId.generate()
    const tokens = await issueTokenPair({
      userId: userId.toString(),
      workspaceId: WorkspaceId.generate().toString(),
      role: UserRole.Operator,
      jwtSecret: SECRET,
      refreshTokenRepository,
    })

    const command = new RevokeSessionCommand(refreshTokenRepository)
    const result = await command.execute({ userId: userId.toString(), refreshToken: tokens.refreshToken })

    expect(result.isOk()).toBe(true)
    const record = [...refreshTokenRepository.records.values()][0]!
    expect(record.revokedAt).not.toBeNull()
  })

  it('rejects revoking a token owned by another user', async () => {
    const refreshTokenRepository = new InMemoryRefreshTokenRepository()
    const tokens = await issueTokenPair({
      userId: UserId.generate().toString(),
      workspaceId: WorkspaceId.generate().toString(),
      role: UserRole.Operator,
      jwtSecret: SECRET,
      refreshTokenRepository,
    })

    const command = new RevokeSessionCommand(refreshTokenRepository)
    const result = await command.execute({
      userId: UserId.generate().toString(),
      refreshToken: tokens.refreshToken,
    })

    expect(result.isFail()).toBe(true)
  })
})
