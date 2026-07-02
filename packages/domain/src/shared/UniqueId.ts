import { ulid } from 'ulid'

export class UniqueId {
  private readonly _value: string

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('UniqueId cannot be empty')
    }
    this._value = value
  }

  static generate(): UniqueId {
    return new UniqueId(ulid())
  }

  static from(value: string): UniqueId {
    return new UniqueId(value)
  }

  equals(other: UniqueId): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }
}
