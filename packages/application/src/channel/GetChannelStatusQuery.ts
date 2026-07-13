import { ChannelConnection, ChannelType } from '@bcp/domain'
import { IChannelConnectionRepository } from '@bcp/contracts'

export interface GetChannelStatusInput {
  workspaceId: string
  channel: ChannelType
}

export class GetChannelStatusQuery {
  constructor(private readonly channelConnectionRepository: IChannelConnectionRepository) {}

  async execute(input: GetChannelStatusInput): Promise<ChannelConnection[]> {
    return this.channelConnectionRepository.findByChannel(input.workspaceId, input.channel)
  }
}
