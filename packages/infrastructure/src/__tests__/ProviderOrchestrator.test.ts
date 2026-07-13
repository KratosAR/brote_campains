import { Result, ChannelConnection, ChannelConnectionId, ChannelType, Delivery, NotFoundError } from '@bcp/domain'
import { ProviderError, messagesSentTotal, providerLatencyMs, type HealthStatus, type MessagingProvider, type OutboundMessage, type ProviderCapabilities } from '@bcp/contracts'
import type { IChannelConnectionRepository } from '@bcp/contracts'

import { ProviderRegistry } from '../providers/ProviderRegistry'
import { ProviderOrchestrator } from '../providers/ProviderOrchestrator'

function capabilities(): ProviderCapabilities {
  return { supportsTemplates: false, supportsMedia: false, supportsButtons: false, maxMessagesPerMinute: 60 }
}

class FakeInMemoryChannelConnectionRepository implements IChannelConnectionRepository {
  constructor(private readonly connections: ChannelConnection[]) {}

  async findById(id: ChannelConnectionId, workspaceId: string): Promise<Result<ChannelConnection, NotFoundError>> {
    const found = this.connections.find((c) => c.connectionId.toString() === id.toString() && c.workspaceId === workspaceId)
    return found ? Result.ok(found) : Result.fail(new NotFoundError('ChannelConnection', id.toString()))
  }

  async findByWorkspace(workspaceId: string): Promise<ChannelConnection[]> {
    return this.connections.filter((c) => c.workspaceId === workspaceId)
  }

  async findByChannel(workspaceId: string, channel: ChannelType): Promise<ChannelConnection[]> {
    return this.connections.filter((c) => c.workspaceId === workspaceId && c.channel === channel)
  }

  async save(): Promise<Result<void, NotFoundError>> {
    return Result.ok(undefined)
  }
}

function makeConnectedConnection(providerId: string, priority: number): ChannelConnection {
  const connection = ChannelConnection.create('workspace-1', ChannelType.WhatsApp, providerId, {}, priority).getValue()
  connection.markConnected(capabilities() as unknown as Record<string, unknown>)
  return connection
}

function makeDelivery(): Delivery {
  return Delivery.create('campaign-1', 'workspace-1', 'contact-1', ChannelType.WhatsApp, '+5491100000', 'Hello').getValue()
}

describe('ProviderOrchestrator', () => {
  it('resolves the enabled connected provider with the lowest priority', async () => {
    const registry = new ProviderRegistry()
    const primaryProvider: MessagingProvider = {
      providerId: 'primary',
      send: async () => ({ providerMessageId: 'ok', timestamp: new Date() }),
      health: async (): Promise<HealthStatus> => ({ status: 'online', latencyMs: 1 }),
      capabilities,
    }
    registry.register(primaryProvider)

    const repo = new FakeInMemoryChannelConnectionRepository([makeConnectedConnection('primary', 1)])
    const orchestrator = new ProviderOrchestrator(registry, repo)

    const result = await orchestrator.resolve('workspace-1', ChannelType.WhatsApp)
    expect(result.isOk()).toBe(true)
    expect(result.getValue().providerId).toBe('primary')
  })

  it('sends via the primary provider on success', async () => {
    const registry = new ProviderRegistry()
    registry.register({
      providerId: 'primary',
      send: async (_msg: OutboundMessage) => ({ providerMessageId: 'sent-1', timestamp: new Date() }),
      health: async (): Promise<HealthStatus> => ({ status: 'online', latencyMs: 1 }),
      capabilities,
    })

    const repo = new FakeInMemoryChannelConnectionRepository([makeConnectedConnection('primary', 1)])
    const orchestrator = new ProviderOrchestrator(registry, repo)

    const result = await orchestrator.send(makeDelivery(), 'workspace-1')
    expect(result.isOk()).toBe(true)
    expect(result.getValue().providerMessageId).toBe('sent-1')
  })

  it('smart routing: retries with the secondary provider when the primary throws a TemporaryError', async () => {
    const registry = new ProviderRegistry()
    registry.register({
      providerId: 'primary',
      send: async () => {
        throw new ProviderError('TemporaryError', 'primary down')
      },
      health: async (): Promise<HealthStatus> => ({ status: 'offline', latencyMs: 1 }),
      capabilities,
    })
    registry.register({
      providerId: 'secondary',
      send: async () => ({ providerMessageId: 'sent-via-secondary', timestamp: new Date() }),
      health: async (): Promise<HealthStatus> => ({ status: 'online', latencyMs: 1 }),
      capabilities,
    })

    const repo = new FakeInMemoryChannelConnectionRepository([
      makeConnectedConnection('primary', 1),
      makeConnectedConnection('secondary', 2),
    ])
    const orchestrator = new ProviderOrchestrator(registry, repo)

    const result = await orchestrator.send(makeDelivery(), 'workspace-1')
    expect(result.isOk()).toBe(true)
    expect(result.getValue().providerMessageId).toBe('sent-via-secondary')
  })

  it('propagates the error when no secondary provider is available', async () => {
    const registry = new ProviderRegistry()
    registry.register({
      providerId: 'primary',
      send: async () => {
        throw new ProviderError('NetworkError', 'primary down')
      },
      health: async (): Promise<HealthStatus> => ({ status: 'offline', latencyMs: 1 }),
      capabilities,
    })

    const repo = new FakeInMemoryChannelConnectionRepository([makeConnectedConnection('primary', 1)])
    const orchestrator = new ProviderOrchestrator(registry, repo)

    const result = await orchestrator.send(makeDelivery(), 'workspace-1')
    expect(result.isFail()).toBe(true)
    expect((result.getError() as ProviderError).kind).toBe('NetworkError')
  })

  it('does not retry for a PermanentError', async () => {
    const registry = new ProviderRegistry()
    registry.register({
      providerId: 'primary',
      send: async () => {
        throw new ProviderError('PermanentError', 'bad request')
      },
      health: async (): Promise<HealthStatus> => ({ status: 'online', latencyMs: 1 }),
      capabilities,
    })
    registry.register({
      providerId: 'secondary',
      send: async () => ({ providerMessageId: 'should-not-be-called', timestamp: new Date() }),
      health: async (): Promise<HealthStatus> => ({ status: 'online', latencyMs: 1 }),
      capabilities,
    })

    const repo = new FakeInMemoryChannelConnectionRepository([
      makeConnectedConnection('primary', 1),
      makeConnectedConnection('secondary', 2),
    ])
    const orchestrator = new ProviderOrchestrator(registry, repo)

    const result = await orchestrator.send(makeDelivery(), 'workspace-1')
    expect(result.isFail()).toBe(true)
    expect((result.getError() as ProviderError).kind).toBe('PermanentError')
  })

  it('instruments messages_sent_total and provider_latency_ms on send', async () => {
    const registry = new ProviderRegistry()
    registry.register({
      providerId: 'metrics-provider',
      send: async () => ({ providerMessageId: 'sent-metrics', timestamp: new Date() }),
      health: async (): Promise<HealthStatus> => ({ status: 'online', latencyMs: 1 }),
      capabilities,
    })

    const repo = new FakeInMemoryChannelConnectionRepository([makeConnectedConnection('metrics-provider', 1)])
    const orchestrator = new ProviderOrchestrator(registry, repo)

    const successBefore = (await messagesSentTotal.get()).values.find(
      (v) => v.labels.provider === 'metrics-provider' && v.labels.status === 'success',
    )?.value ?? 0
    const latencySamplesBefore = (await providerLatencyMs.get()).values.filter(
      (v) => v.labels.provider === 'metrics-provider' && v.metricName?.endsWith('_count'),
    )
    const latencyCountBefore = latencySamplesBefore[0]?.value ?? 0

    await orchestrator.send(makeDelivery(), 'workspace-1')

    const successAfter = (await messagesSentTotal.get()).values.find(
      (v) => v.labels.provider === 'metrics-provider' && v.labels.status === 'success',
    )?.value ?? 0
    const latencyCountAfter = (await providerLatencyMs.get()).values.find(
      (v) => v.labels.provider === 'metrics-provider' && v.metricName?.endsWith('_count'),
    )?.value ?? 0

    expect(successAfter).toBe(successBefore + 1)
    expect(latencyCountAfter).toBe(latencyCountBefore + 1)
  })
})
