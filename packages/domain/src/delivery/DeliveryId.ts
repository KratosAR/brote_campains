import { UniqueId } from '../shared/UniqueId'

export class DeliveryId extends UniqueId {
  static generate(): DeliveryId {
    return new DeliveryId(UniqueId.generate().toString())
  }

  static from(value: string): DeliveryId {
    return new DeliveryId(value)
  }
}
