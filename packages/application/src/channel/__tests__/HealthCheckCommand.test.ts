import { ChannelConnection, ChannelType } from '@bcp/domain'
import { HealthCheckCommand } from '../HealthCheckCommand'
import { InMemoryChannelConnectionRepository, FakeProvider, FakeProviderRegistry } from './testDoubles'

describe('HealthCheckCommand', () => {
  it('marca Connected si el provider está online', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const connection = ChannelConnection.create('ws-1', ChannelType.WhatsApp, 'meta', {}, 1).getValue()
    await repository.save(connection)
    const registry = new FakeProviderRegistry()
    const provider = new FakeProvider('meta')
    provider.healthStatus = { status: 'online', latencyMs: 5 }
    registry.register(provider)

    const command = new HealthCheckCommand(repository, registry)
    const result = await command.execute({ connectionId: connection.connectionId.toString(), workspaceId: 'ws-1' })

    expect(result.isOk()).toBe(true)
    const saved = repository.connections.get(connection.connectionId.toString())!
    expect(saved.status).toBe('Connected')
  })

  it('marca Error si el provider está offline', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const connection = ChannelConnection.create('ws-1', ChannelType.WhatsApp, 'meta', {}, 1).getValue()
    await repository.save(connection)
    const registry = new FakeProviderRegistry()
    const provider = new FakeProvider('meta')
    provider.healthStatus = { status: 'offline', latencyMs: 0 }
    registry.register(provider)

    const command = new HealthCheckCommand(repository, registry)
    const result = await command.execute({ connectionId: connection.connectionId.toString(), workspaceId: 'ws-1' })

    expect(result.isOk()).toBe(true)
    const saved = repository.connections.get(connection.connectionId.toString())!
    expect(saved.status).toBe('Error')
  })
})
