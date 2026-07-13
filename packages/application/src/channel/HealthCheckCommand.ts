import { ChannelConnectionId, Result, DomainError } from '@bcp/domain'
import { IChannelConnectionRepository } from '@bcp/contracts'
import { HealthStatus, providerHealthStatus } from '@bcp/contracts'
import { IProviderRegistry } from './ConnectProviderCommand'

export interface HealthCheckInput {
  connectionId: string
  workspaceId: string
}

export class HealthCheckCommand {
  constructor(
    private readonly channelConnectionRepository: IChannelConnectionRepository,
    private readonly providerRegistry: IProviderRegistry,
  ) {}

  async execute(input: HealthCheckInput): Promise<Result<HealthStatus, DomainError>> {
    const found = await this.channelConnectionRepository.findById(ChannelConnectionId.from(input.connectionId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const connection = found.getValue()

    const providerResult = this.providerRegistry.get(connection.providerId)
    if (providerResult.isFail()) return Result.fail(providerResult.getError())
    const provider = providerResult.getValue()

    const health = await provider.health(connection.credentials)
    providerHealthStatus.set({ provider: connection.providerId, workspace: input.workspaceId }, health.status === 'online' ? 1 : 0)

    if (health.status === 'offline') {
      connection.markError('health check failed')
    } else {
      connection.markConnected(connection.capabilities ?? {})
    }

    const saveResult = await this.channelConnectionRepository.save(connection)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(health)
  }
}
