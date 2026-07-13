import { AggregateRoot } from '../shared/AggregateRoot'
import { Result } from '../shared/Result'
import { DomainError, ValidationError } from '../shared/errors/DomainError'
import { ChannelType } from '../contact/ChannelType'
import { ChannelConnectionId } from './ChannelConnectionId'
import { ConnectionStatus } from './ConnectionStatus'

interface ChannelConnectionProps {
  workspaceId: string
  channel: ChannelType
  providerId: string
  status: ConnectionStatus
  priority: number
  enabled: boolean
  credentials: unknown
  capabilities?: Record<string, unknown>
  lastHealthCheck?: Date
}

export class ChannelConnection extends AggregateRoot<ChannelConnectionProps> {
  private constructor(props: ChannelConnectionProps, id?: ChannelConnectionId, createdAt?: Date) {
    super(props, id, createdAt)
  }

  static create(
    workspaceId: string,
    channel: ChannelType,
    providerId: string,
    credentials: unknown,
    priority: number,
  ): Result<ChannelConnection, ValidationError> {
    if (priority < 1) {
      return Result.fail(new ValidationError('ChannelConnection priority must be >= 1', 'priority'))
    }

    return Result.ok(
      new ChannelConnection({
        workspaceId,
        channel,
        providerId,
        status: ConnectionStatus.Pending,
        priority,
        enabled: true,
        credentials,
      }),
    )
  }

  static hydrate(props: ChannelConnectionProps, id: ChannelConnectionId, createdAt: Date, updatedAt: Date): ChannelConnection {
    const connection = new ChannelConnection(props, id, createdAt)
    connection.updatedAt = updatedAt
    return connection
  }

  get connectionId(): ChannelConnectionId {
    return this._id as ChannelConnectionId
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get channel(): ChannelType {
    return this.props.channel
  }

  get providerId(): string {
    return this.props.providerId
  }

  get status(): ConnectionStatus {
    return this.props.status
  }

  get priority(): number {
    return this.props.priority
  }

  get enabled(): boolean {
    return this.props.enabled
  }

  get credentials(): unknown {
    return this.props.credentials
  }

  get capabilities(): Record<string, unknown> | undefined {
    return this.props.capabilities
  }

  get lastHealthCheck(): Date | undefined {
    return this.props.lastHealthCheck
  }

  markConnected(capabilities: Record<string, unknown>): Result<void, DomainError> {
    this.props = {
      ...this.props,
      status: ConnectionStatus.Connected,
      capabilities,
      lastHealthCheck: new Date(),
    }
    return Result.ok(undefined)
  }

  markDisconnected(_reason: string): Result<void, DomainError> {
    // ponytail: reason no se persiste — el spec no pide timeline acá, solo la transición de estado (YAGNI)
    this.props = { ...this.props, status: ConnectionStatus.Disconnected }
    return Result.ok(undefined)
  }

  markError(_error: string): Result<void, DomainError> {
    this.props = { ...this.props, status: ConnectionStatus.Error }
    return Result.ok(undefined)
  }

  disable(): void {
    this.props = { ...this.props, enabled: false }
  }

  enable(): Result<void, DomainError> {
    // ponytail: BR-002 es una invariante cross-aggregate (requiere consultar otras ChannelConnection
    // del mismo workspace+channel+priority=1) — se verifica en el Application layer (casos de uso),
    // no acá, mismo criterio que WorkspaceIsActive en CampaignCanStart (Sprint 5)
    this.props = { ...this.props, enabled: true }
    return Result.ok(undefined)
  }
}
