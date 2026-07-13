import { ChannelConnection, ChannelType, ConnectionStatus, Result, DomainError, ValidationError, BusinessRuleViolationError } from '@bcp/domain'
import { IChannelConnectionRepository } from '@bcp/contracts'
import { MessagingProvider } from '@bcp/contracts'

// ponytail: interfaz mínima local en vez de acoplarse al ProviderRegistry concreto de infra —
// mismo criterio que otros Commands reciben contratos, no implementaciones.
export interface IProviderRegistry {
  get(providerId: string): Result<MessagingProvider, DomainError>
}

export interface ConnectProviderInput {
  workspaceId: string
  channel: ChannelType
  providerId: string
  credentials: unknown
  priority?: number
  // ponytail: userId no persistido, ChannelConnection no trackea createdBy todavía
  userId: string
}

export class ConnectProviderCommand {
  constructor(
    private readonly channelConnectionRepository: IChannelConnectionRepository,
    private readonly providerRegistry: IProviderRegistry,
  ) {}

  async execute(input: ConnectProviderInput): Promise<Result<ChannelConnection, DomainError>> {
    const priority = input.priority ?? 1

    const providerResult = this.providerRegistry.get(input.providerId)
    if (providerResult.isFail()) return Result.fail(providerResult.getError())
    const provider = providerResult.getValue()

    if (priority === 1) {
      const existing = await this.channelConnectionRepository.findByChannel(input.workspaceId, input.channel)
      const conflict = existing.some((c) => c.enabled && c.status === ConnectionStatus.Connected && c.priority === 1)
      if (conflict) {
        return Result.fail(
          new BusinessRuleViolationError(
            `Ya existe una conexión primaria activa para el canal ${input.channel}`,
            'BR-002',
          ),
        )
      }
    }

    const createResult = ChannelConnection.create(input.workspaceId, input.channel, input.providerId, input.credentials, priority)
    if (createResult.isFail()) return Result.fail(createResult.getError())
    const connection = createResult.getValue()

    if (provider.connect) {
      try {
        await provider.connect(input.credentials)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Provider connect failed'
        return Result.fail(new ValidationError(message))
      }
    }

    connection.markConnected({ ...provider.capabilities() })

    const saveResult = await this.channelConnectionRepository.save(connection)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(connection)
  }
}
