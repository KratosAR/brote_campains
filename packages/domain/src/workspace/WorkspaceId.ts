import { UniqueId } from '../shared/UniqueId'

export class WorkspaceId extends UniqueId {
  static generate(): WorkspaceId {
    return new WorkspaceId(UniqueId.generate().toString())
  }

  static from(value: string): WorkspaceId {
    return new WorkspaceId(value)
  }
}
