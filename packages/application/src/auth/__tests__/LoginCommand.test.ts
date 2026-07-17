import { UserId, WorkspaceId, UserRole, WorkspaceUser } from '@bcp/domain'
import { LoginCommand } from '../LoginCommand'
import { hashPassword } from '../security/passwordHasher'
import {
  InMemoryUserRepository,
  InMemoryWorkspaceUserRepository,
  InMemoryRefreshTokenRepository,
} from './testDoubles'

const SECRET = 'a'.repeat(32)

async function seedUser(userRepository: InMemoryUserRepository, password: string) {
  const userId = UserId.generate()
  const passwordHash = await hashPassword(password)
  await userRepository.save({
    id: userId.toString(),
    email: 'user@example.com',
    passwordHash,
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return userId
}

describe('LoginCommand', () => {
  it('returns tokens for valid credentials', async () => {
    const userRepository = new InMemoryUserRepository()
    const workspaceUserRepository = new InMemoryWorkspaceUserRepository()
    const refreshTokenRepository = new InMemoryRefreshTokenRepository()
    const userId = await seedUser(userRepository, 'Correct@Pass1')
    workspaceUserRepository.memberships.push(
      WorkspaceUser.create({
        userId,
        workspaceId: WorkspaceId.generate(),
        role: UserRole.Owner,
        invitedAt: new Date(),
        joinedAt: new Date(),
      }),
    )

    const command = new LoginCommand(userRepository, workspaceUserRepository, refreshTokenRepository, SECRET)
    const result = await command.execute({ email: 'user@example.com', password: 'Correct@Pass1' })

    expect(result.isOk()).toBe(true)
  })

  it('returns the same error for unknown email and wrong password', async () => {
    const userRepository = new InMemoryUserRepository()
    const workspaceUserRepository = new InMemoryWorkspaceUserRepository()
    const refreshTokenRepository = new InMemoryRefreshTokenRepository()
    await seedUser(userRepository, 'Correct@Pass1')

    const command = new LoginCommand(userRepository, workspaceUserRepository, refreshTokenRepository, SECRET)

    const unknownEmail = await command.execute({ email: 'nope@example.com', password: 'whatever' })
    const wrongPassword = await command.execute({ email: 'user@example.com', password: 'wrong' })

    expect(unknownEmail.isFail()).toBe(true)
    expect(wrongPassword.isFail()).toBe(true)
    expect(unknownEmail.getError().message).toBe(wrongPassword.getError().message)
    expect(unknownEmail.getError().code).toBe('UNAUTHORIZED')
  })
})
