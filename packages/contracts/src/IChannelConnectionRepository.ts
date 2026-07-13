import { Result, ChannelConnection, ChannelConnectionId, ChannelType, NotFoundError } from '@bcp/domain'

export interface IChannelConnectionRepository {
  findById(id: ChannelConnectionId, workspaceId: string): Promise<Result<ChannelConnection, NotFoundError>>
  findByWorkspace(workspaceId: string): Promise<ChannelConnection[]>
  findByChannel(workspaceId: string, channel: ChannelType): Promise<ChannelConnection[]>
  save(connection: ChannelConnection): Promise<Result<void, NotFoundError>>
}
