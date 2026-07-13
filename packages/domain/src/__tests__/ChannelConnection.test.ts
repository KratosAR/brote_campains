import { ChannelConnection } from '../channel/ChannelConnection'
import { ConnectionStatus } from '../channel/ConnectionStatus'
import { ChannelType } from '../contact/ChannelType'
import { ValidationError } from '../shared/errors/DomainError'

function created(credentials: unknown = { token: 'secret' }) {
  return ChannelConnection.create('workspace-1', ChannelType.WhatsApp, 'meta', credentials, 1).getValue()
}

describe('ChannelConnection.create', () => {
  it('creates a Pending, enabled connection', () => {
    const connection = created()

    expect(connection.status).toBe(ConnectionStatus.Pending)
    expect(connection.enabled).toBe(true)
    expect(connection.priority).toBe(1)
  })

  it('fails when priority < 1', () => {
    const result = ChannelConnection.create('workspace-1', ChannelType.WhatsApp, 'meta', {}, 0)

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('preserves opaque credentials without interpreting them', () => {
    const credentials = { accessToken: 'raw-value', nested: { anything: true } }
    const connection = created(credentials)

    expect(connection.credentials).toBe(credentials)
  })
})

describe('ChannelConnection transitions', () => {
  it('markConnected sets status, capabilities, and lastHealthCheck', () => {
    const connection = created()
    const capabilities = { supportsTemplates: true, maxMessagesPerMinute: 100 }

    const result = connection.markConnected(capabilities)

    expect(result.isOk()).toBe(true)
    expect(connection.status).toBe(ConnectionStatus.Connected)
    expect(connection.capabilities).toBe(capabilities)
    expect(connection.lastHealthCheck).toBeInstanceOf(Date)
  })

  it('markDisconnected sets status to Disconnected', () => {
    const connection = created()
    connection.markConnected({})

    const result = connection.markDisconnected('provider dropped session')

    expect(result.isOk()).toBe(true)
    expect(connection.status).toBe(ConnectionStatus.Disconnected)
  })

  it('markError sets status to Error', () => {
    const connection = created()

    const result = connection.markError('invalid access token')

    expect(result.isOk()).toBe(true)
    expect(connection.status).toBe(ConnectionStatus.Error)
  })

  it('disable sets enabled to false', () => {
    const connection = created()

    connection.disable()

    expect(connection.enabled).toBe(false)
  })

  it('enable sets enabled to true', () => {
    const connection = created()
    connection.disable()

    const result = connection.enable()

    expect(result.isOk()).toBe(true)
    expect(connection.enabled).toBe(true)
  })
})
