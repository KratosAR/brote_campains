import { ValueObject } from '../shared/ValueObject'
import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'
import { Email } from '../shared/value-objects/Email'
import { PhoneNumber } from '../shared/value-objects/PhoneNumber'
import { ChannelType } from './ChannelType'

interface ContactChannelProps {
  type: ChannelType
  value: string
  verified: boolean
  isPrimary: boolean
}

interface ContactChannelOptions {
  verified?: boolean
  isPrimary?: boolean
}

export class ContactChannel extends ValueObject<ContactChannelProps> {
  private constructor(props: ContactChannelProps) {
    super(props)
  }

  static create(
    type: ChannelType,
    value: string,
    opts: ContactChannelOptions = {},
  ): Result<ContactChannel, ValidationError> {
    let normalized: string

    if (type === ChannelType.WhatsApp || type === ChannelType.SMS) {
      const phone = PhoneNumber.create(value)
      if (phone.isFail()) return Result.fail(phone.getError())
      normalized = phone.getValue().toE164()
    } else if (type === ChannelType.Email) {
      const email = Email.create(value)
      if (email.isFail()) return Result.fail(email.getError())
      normalized = email.getValue().toString()
    } else {
      if (!value || value.trim().length === 0) {
        return Result.fail(new ValidationError('Channel value cannot be empty', 'value'))
      }
      normalized = value.trim()
    }

    return Result.ok(
      new ContactChannel({
        type,
        value: normalized,
        verified: opts.verified ?? false,
        isPrimary: opts.isPrimary ?? false,
      }),
    )
  }

  get type(): ChannelType {
    return this.props.type
  }

  get value(): string {
    return this.props.value
  }

  get verified(): boolean {
    return this.props.verified
  }

  get isPrimary(): boolean {
    return this.props.isPrimary
  }

  sameChannelAs(other: ContactChannel): boolean {
    return this.props.type === other.props.type && this.props.value === other.props.value
  }
}
