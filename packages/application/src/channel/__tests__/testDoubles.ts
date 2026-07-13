import { Result, NotFoundError, ChannelConnection, ChannelConnectionId, ChannelType, DomainError, ValidationError } from '@bcp/domain'
import { IChannelConnectionRepository, MessagingProvider, HealthStatus, ProviderCapabilities } from '@bcp/contracts'
import { IProviderRegistry } from '../ConnectProviderCommand'

export class InMemoryChannelConnectionRepository implements IChannelConnectionRepository {
  readonly connections = new Map<string, ChannelConnection>()

  async findById(id: ChannelConnectionId, workspaceId: string): Promise<Result<ChannelConnection, NotFoundError>> {
    const found = this.connections.get(id.toString())
    if (!found || found.workspaceId !== workspaceId) {
      return Result.fail(new NotFoundError('ChannelConnection', id.toString()))
    }
    return Result.ok(found)
  }

  async findByWorkspace(workspaceId: string): Promise<ChannelConnection[]> {
    return [...this.connections.values()].filter((c) => c.workspaceId === workspaceId)
  }

  async findByChannel(workspaceId: string, channel: ChannelType): Promise<ChannelConnection[]> {
    return [...this.connections.values()].filter((c) => c.workspaceId === workspaceId && c.channel === channel)
  }

  async save(connection: ChannelConnection): Promise<Result<void, NotFoundError>> {
    this.connections.set(connection.connectionId.toString(), connection)
    return Result.ok(undefined)
  }
}

const defaultCapabilities: ProviderCapabilities = {
  supportsTemplates: true,
  supportsMedia: true,
  supportsButtons: false,
  maxMessagesPerMinute: 60,
}

export class FakeProvider implements MessagingProvider {
  healthStatus: HealthStatus = { status: 'online', latencyMs: 10 }
  shouldFailConnect = false

  constructor(readonly providerId: string) {}

  async connect(): Promise<void> {
    if (this.shouldFailConnect) throw new Error('connect failed')
  }

  async send() {
    return { providerMessageId: 'msg-1', timestamp: new Date() }
  }

  async health(): Promise<HealthStatus> {
    return this.healthStatus
  }

  capabilities(): ProviderCapabilities {
    return defaultCapabilities
  }
}

export class FakeProviderRegistry implements IProviderRegistry {
  private readonly providers = new Map<string, MessagingProvider>()

  register(provider: MessagingProvider): void {
    this.providers.set(provider.providerId, provider)
  }

  get(providerId: string): Result<MessagingProvider, DomainError> {
    const found = this.providers.get(providerId)
    if (!found) return Result.fail(new ValidationError(`Provider "${providerId}" not found`, 'providerId'))
    return Result.ok(found)
  }
}
