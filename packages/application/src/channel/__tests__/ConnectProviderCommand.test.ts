import { ChannelType, BusinessRuleViolationError } from '@bcp/domain'
import { ConnectProviderCommand } from '../ConnectProviderCommand'
import { InMemoryChannelConnectionRepository, FakeProvider, FakeProviderRegistry } from './testDoubles'

describe('ConnectProviderCommand', () => {
  it('conecta y persiste una nueva conexión', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const registry = new FakeProviderRegistry()
    registry.register(new FakeProvider('meta'))
    const command = new ConnectProviderCommand(repository, registry)

    const result = await command.execute({
      workspaceId: 'ws-1',
      channel: ChannelType.WhatsApp,
      providerId: 'meta',
      credentials: { token: 'abc' },
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    const connection = result.getValue()
    expect(connection.status).toBe('Connected')
    expect(repository.connections.size).toBe(1)
  })

  it('falla si el provider no existe', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const registry = new FakeProviderRegistry()
    const command = new ConnectProviderCommand(repository, registry)

    const result = await command.execute({
      workspaceId: 'ws-1',
      channel: ChannelType.WhatsApp,
      providerId: 'unknown',
      credentials: {},
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })

  it('rechaza BR-002: ya existe una conexión priority=1 Connected+enabled para el canal', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const registry = new FakeProviderRegistry()
    registry.register(new FakeProvider('meta'))
    registry.register(new FakeProvider('evolution'))
    const command = new ConnectProviderCommand(repository, registry)

    const first = await command.execute({
      workspaceId: 'ws-1',
      channel: ChannelType.WhatsApp,
      providerId: 'meta',
      credentials: {},
      userId: 'user-1',
    })
    expect(first.isOk()).toBe(true)

    const second = await command.execute({
      workspaceId: 'ws-1',
      channel: ChannelType.WhatsApp,
      providerId: 'evolution',
      credentials: {},
      priority: 1,
      userId: 'user-1',
    })

    expect(second.isFail()).toBe(true)
    expect(second.getError()).toBeInstanceOf(BusinessRuleViolationError)
  })

  it('falla si provider.connect() lanza', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const registry = new FakeProviderRegistry()
    const provider = new FakeProvider('meta')
    provider.shouldFailConnect = true
    registry.register(provider)
    const command = new ConnectProviderCommand(repository, registry)

    const result = await command.execute({
      workspaceId: 'ws-1',
      channel: ChannelType.WhatsApp,
      providerId: 'meta',
      credentials: {},
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
