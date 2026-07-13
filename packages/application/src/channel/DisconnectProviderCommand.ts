import { ChannelConnectionId, Result, DomainError } from '@bcp/domain'
import { IChannelConnectionRepository } from '@bcp/contracts'

export interface DisconnectProviderInput {
  connectionId: string
  workspaceId: string
  // ponytail: userId no persistido, ChannelConnection no trackea createdBy todavía
  userId: string
}

export class DisconnectProviderCommand {
  constructor(private readonly channelConnectionRepository: IChannelConnectionRepository) {}

  async execute(input: DisconnectProviderInput): Promise<Result<void, DomainError>> {
    const found = await this.channelConnectionRepository.findById(ChannelConnectionId.from(input.connectionId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const connection = found.getValue()

    connection.markDisconnected('manual disconnect')
    connection.disable()

    const saveResult = await this.channelConnectionRepository.save(connection)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
