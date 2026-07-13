import { ValueObject } from '../shared/ValueObject'

interface DeliveryAttemptProps {
  attemptNumber: number
  startedAt: Date
  completedAt?: Date
  providerMessageId?: string
  errorCode?: string
  errorMessage?: string
  success: boolean
}

export class DeliveryAttempt extends ValueObject<DeliveryAttemptProps> {
  private constructor(props: DeliveryAttemptProps) {
    super(props)
  }

  static start(attemptNumber: number, startedAt?: Date): DeliveryAttempt {
    return new DeliveryAttempt({ attemptNumber, startedAt: startedAt ?? new Date(), success: false })
  }

  static create(props: DeliveryAttemptProps): DeliveryAttempt {
    return new DeliveryAttempt(props)
  }

  withSuccess(providerMessageId: string, completedAt?: Date): DeliveryAttempt {
    return new DeliveryAttempt({
      ...this.props,
      success: true,
      providerMessageId,
      completedAt: completedAt ?? new Date(),
    })
  }

  withFailure(error: { errorCode?: string; errorMessage?: string }, completedAt?: Date): DeliveryAttempt {
    return new DeliveryAttempt({
      ...this.props,
      success: false,
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
      completedAt: completedAt ?? new Date(),
    })
  }

  get attemptNumber(): number {
    return this.props.attemptNumber
  }

  get startedAt(): Date {
    return this.props.startedAt
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt
  }

  get providerMessageId(): string | undefined {
    return this.props.providerMessageId
  }

  get errorCode(): string | undefined {
    return this.props.errorCode
  }

  get errorMessage(): string | undefined {
    return this.props.errorMessage
  }

  get success(): boolean {
    return this.props.success
  }
}
