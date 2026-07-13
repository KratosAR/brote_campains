import { ChannelConnection, ChannelType } from '@bcp/domain'

import { ChannelConnectionMapper } from '../persistence/ChannelConnectionMapper'

function makeConnection(): ChannelConnection {
  return ChannelConnection.create(
    'workspace-1',
    ChannelType.WhatsApp,
    'evolution-provider',
    { token: 'secret-token' },
    1,
  ).getValue()
}

describe('ChannelConnectionMapper', () => {
  it('round-trips a connection through toPersistence/toDomain', () => {
    const connection = makeConnection()
    const decryptedCredentials = JSON.stringify(connection.credentials)

    const record = ChannelConnectionMapper.toPersistence(connection, 'irrelevant-ciphertext')
    const hydrated = ChannelConnectionMapper.toDomain(record as never, decryptedCredentials)

    expect(hydrated.workspaceId).toBe('workspace-1')
    expect(hydrated.channel).toBe(ChannelType.WhatsApp)
    expect(hydrated.providerId).toBe('evolution-provider')
    expect(hydrated.priority).toBe(1)
    expect(hydrated.credentials).toEqual({ token: 'secret-token' })
  })
})
