import { UniqueId } from './UniqueId'

export abstract class Entity<T> {
  protected readonly _id: UniqueId
  protected props: T

  constructor(props: T, id?: UniqueId) {
    this._id = id ?? UniqueId.generate()
    this.props = props
  }

  get id(): UniqueId {
    return this._id
  }

  equals(other: Entity<T>): boolean {
    if (other === null || other === undefined) return false
    if (!(other instanceof Entity)) return false
    return this._id.equals(other._id)
  }
}
