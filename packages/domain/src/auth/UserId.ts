import { UniqueId } from '../shared/UniqueId'

export class UserId extends UniqueId {
  static generate(): UserId {
    return new UserId(UniqueId.generate().toString())
  }

  static from(value: string): UserId {
    return new UserId(value)
  }
}
