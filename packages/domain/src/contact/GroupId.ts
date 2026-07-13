import { UniqueId } from '../shared/UniqueId'

export class GroupId extends UniqueId {
  static generate(): GroupId {
    return new GroupId(UniqueId.generate().toString())
  }

  static from(value: string): GroupId {
    return new GroupId(value)
  }
}
