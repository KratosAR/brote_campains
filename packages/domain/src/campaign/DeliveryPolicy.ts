import { ValueObject } from '../shared/ValueObject'

interface DeliveryPolicyProps {
  maxRetries: number
  retryDelays: number[]
  skipOptOut: boolean
}

export class DeliveryPolicy extends ValueObject<DeliveryPolicyProps> {
  private constructor(props: DeliveryPolicyProps) {
    // BR-003: skipOptOut es invariante de negocio, siempre false sin importar lo que se pida.
    super({ ...props, skipOptOut: false })
  }

  static create(props: { maxRetries: number; retryDelays: number[] }): DeliveryPolicy {
    return new DeliveryPolicy({ ...props, skipOptOut: false })
  }

  static default(): DeliveryPolicy {
    return new DeliveryPolicy({ maxRetries: 3, retryDelays: [60, 300, 900], skipOptOut: false })
  }

  get maxRetries(): number {
    return this.props.maxRetries
  }

  get retryDelays(): number[] {
    return [...this.props.retryDelays]
  }

  get skipOptOut(): boolean {
    return this.props.skipOptOut
  }
}
