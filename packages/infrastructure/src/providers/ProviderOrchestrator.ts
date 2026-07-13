import { Result, NotFoundError, ChannelConnection, ChannelType, ConnectionStatus, Delivery } from '@bcp/domain'
import type { IChannelConnectionRepository } from '@bcp/contracts'
import { ProviderError, type MessagingProvider, type ProviderResponse } from '@bcp/contracts'

import { ProviderRegistry } from './ProviderRegistry'
import { messagesSentTotal, providerLatencyMs } from '@bcp/contracts'

// ponytail: retry solo se dispara para NetworkError/TemporaryError (errores transitorios) —
// PermanentError/RateLimitError/AuthError propagan directo, reintentar no los resuelve.
const RETRYABLE_KINDS = ['NetworkError', 'TemporaryError']

export class ProviderOrchestrator {
  constructor(
    private readonly providerRegistry: ProviderRegistry,
    private readonly channelConnectionRepository: IChannelConnectionRepository,
  ) {}

  async resolve(workspaceId: string, channel: ChannelType): Promise<Result<MessagingProvider, NotFoundError>> {
    const candidates = await this.eligibleConnections(workspaceId, channel)
    const primary = candidates[0]
    if (!primary) return Result.fail(new NotFoundError('ChannelConnection', `${workspaceId}/${channel}`))
    return this.providerRegistry.get(primary.providerId)
  }

  async send(delivery: Delivery, workspaceId: string): Promise<Result<ProviderResponse, ProviderError>> {
    const candidates = await this.eligibleConnections(workspaceId, delivery.channel)
    const primary = candidates[0]
    if (!primary) return Result.fail(new ProviderError('PermanentError', 'No enabled connected channel connection found'))

    const providerResult = this.providerRegistry.get(primary.providerId)
    if (providerResult.isFail()) return Result.fail(new ProviderError('PermanentError', providerResult.getError().message))

    try {
      const response = await this.timedSend(providerResult.getValue(), primary.providerId, primary.credentials, delivery)
      return Result.ok(response)
    } catch (error) {
      if (!(error instanceof ProviderError) || !RETRYABLE_KINDS.includes(error.kind)) {
        return Result.fail(error instanceof ProviderError ? error : new ProviderError('PermanentError', String(error)))
      }

      const secondary = candidates[1]
      if (!secondary) return Result.fail(error)

      const secondaryProviderResult = this.providerRegistry.get(secondary.providerId)
      if (secondaryProviderResult.isFail()) return Result.fail(error)

      try {
        const response = await this.timedSend(secondaryProviderResult.getValue(), secondary.providerId, secondary.credentials, delivery)
        return Result.ok(response)
      } catch (retryError) {
        return Result.fail(retryError instanceof ProviderError ? retryError : new ProviderError('PermanentError', String(retryError)))
      }
    }
  }

  private async timedSend(
    provider: MessagingProvider,
    providerId: string,
    credentials: unknown,
    delivery: Delivery,
  ): Promise<ProviderResponse> {
    const start = Date.now()
    try {
      const response = await provider.send({ to: delivery.address, body: delivery.messageSnapshot }, credentials)
      providerLatencyMs.observe({ provider: providerId }, Date.now() - start)
      messagesSentTotal.inc({ provider: providerId, status: 'success' })
      return response
    } catch (error) {
      providerLatencyMs.observe({ provider: providerId }, Date.now() - start)
      messagesSentTotal.inc({ provider: providerId, status: 'error' })
      throw error
    }
  }

  private async eligibleConnections(workspaceId: string, channel: ChannelType): Promise<ChannelConnection[]> {
    const connections = await this.channelConnectionRepository.findByChannel(workspaceId, channel)
    return connections
      .filter((c) => c.enabled && c.status === ConnectionStatus.Connected)
      .sort((a, b) => a.priority - b.priority)
  }
}
