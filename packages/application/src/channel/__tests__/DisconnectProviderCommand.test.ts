import { ChannelConnection, ChannelType } from '@bcp/domain'
import { DisconnectProviderCommand } from '../DisconnectProviderCommand'
import { InMemoryChannelConnectionRepository } from './testDoubles'

describe('DisconnectProviderCommand', () => {
  it('desconecta y deshabilita la conexión', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const connection = ChannelConnection.create('ws-1', ChannelType.WhatsApp, 'meta', {}, 1).getValue()
    await repository.save(connection)

    const command = new DisconnectProviderCommand(repository)
    const result = await command.execute({
      connectionId: connection.connectionId.toString(),
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isOk()).toBe(true)
    const saved = repository.connections.get(connection.connectionId.toString())!
    expect(saved.status).toBe('Disconnected')
    expect(saved.enabled).toBe(false)
  })

  it('falla si la conexión no existe', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const command = new DisconnectProviderCommand(repository)

    const result = await command.execute({
      connectionId: '00000000-0000-0000-0000-000000000000',
      workspaceId: 'ws-1',
      userId: 'user-1',
    })

    expect(result.isFail()).toBe(true)
  })
})
