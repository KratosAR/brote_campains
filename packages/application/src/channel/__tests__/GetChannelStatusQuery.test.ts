import { ChannelConnection, ChannelType } from '@bcp/domain'
import { GetChannelStatusQuery } from '../GetChannelStatusQuery'
import { InMemoryChannelConnectionRepository } from './testDoubles'

describe('GetChannelStatusQuery', () => {
  it('retorna las conexiones del canal', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const connection = ChannelConnection.create('ws-1', ChannelType.WhatsApp, 'meta', {}, 1).getValue()
    await repository.save(connection)

    const query = new GetChannelStatusQuery(repository)
    const result = await query.execute({ workspaceId: 'ws-1', channel: ChannelType.WhatsApp })

    expect(result).toHaveLength(1)
    expect(result[0]?.providerId).toBe('meta')
  })

  it('retorna vacío si no hay conexiones', async () => {
    const repository = new InMemoryChannelConnectionRepository()
    const query = new GetChannelStatusQuery(repository)

    const result = await query.execute({ workspaceId: 'ws-1', channel: ChannelType.Email })

    expect(result).toEqual([])
  })
})
