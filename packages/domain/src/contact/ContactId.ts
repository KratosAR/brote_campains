import { UniqueId } from '../shared/UniqueId'

export class ContactId extends UniqueId {
  static generate(): ContactId {
    return new ContactId(UniqueId.generate().toString())
  }

  static from(value: string): ContactId {
    return new ContactId(value)
  }
}
