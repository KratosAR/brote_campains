import { UniqueId } from '../shared/UniqueId'

export class ChannelConnectionId extends UniqueId {
  static generate(): ChannelConnectionId {
    return new ChannelConnectionId(UniqueId.generate().toString())
  }

  static from(value: string): ChannelConnectionId {
    return new ChannelConnectionId(value)
  }
}
