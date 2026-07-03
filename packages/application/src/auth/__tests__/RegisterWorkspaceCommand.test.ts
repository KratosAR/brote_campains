import { RegisterWorkspaceCommand } from '../RegisterWorkspaceCommand'
import {
  InMemoryUserRepository,
  InMemoryWorkspaceRepository,
  InMemoryWorkspaceUserRepository,
  InMemoryRefreshTokenRepository,
  NoopEventBus,
} from './testDoubles'

const SECRET = 'a'.repeat(32)

function makeCommand() {
  const userRepository = new InMemoryUserRepository()
  const workspaceRepository = new InMemoryWorkspaceRepository()
  const workspaceUserRepository = new InMemoryWorkspaceUserRepository()
  const refreshTokenRepository = new InMemoryRefreshTokenRepository()
  const eventBus = new NoopEventBus()
  const command = new RegisterWorkspaceCommand(
    userRepository,
    workspaceRepository,
    workspaceUserRepository,
    refreshTokenRepository,
    eventBus,
    SECRET,
  )
  return { command, userRepository, workspaceRepository, workspaceUserRepository, eventBus }
}

describe('RegisterWorkspaceCommand', () => {
  it('creates a Workspace + Owner User and returns tokens', async () => {
    const { command, userRepository, workspaceRepository, workspaceUserRepository, eventBus } =
      makeCommand()

    const result = await command.execute({
      ownerName: 'Ada Lovelace',
      ownerEmail: 'ada@example.com',
      ownerPassword: 'super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'America/Argentina/Buenos_Aires',
    })

    expect(result.isOk()).toBe(true)
    const output = result.getValue()
    expect(output.accessToken).toEqual(expect.any(String))
    expect(output.refreshToken).toEqual(expect.any(String))
    expect(userRepository.users.size).toBe(1)
    expect(workspaceRepository.workspaces.size).toBe(1)
    expect(workspaceUserRepository.memberships).toHaveLength(1)
    expect(eventBus.published).toHaveLength(1)
  })

  it('rejects duplicate emails', async () => {
    const { command } = makeCommand()
    const input = {
      ownerName: 'Ada',
      ownerEmail: 'dup@example.com',
      ownerPassword: 'super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    }

    await command.execute(input)
    const second = await command.execute({ ...input, workspaceName: 'Other Inc' })

    expect(second.isFail()).toBe(true)
  })

  it('rejects an invalid email', async () => {
    const { command } = makeCommand()
    const result = await command.execute({
      ownerName: 'Ada',
      ownerEmail: 'not-an-email',
      ownerPassword: 'super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })
    expect(result.isFail()).toBe(true)
  })

  it('rejects a short password', async () => {
    const { command } = makeCommand()
    const result = await command.execute({
      ownerName: 'Ada',
      ownerEmail: 'ada2@example.com',
      ownerPassword: 'short',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })
    expect(result.isFail()).toBe(true)
  })
})
