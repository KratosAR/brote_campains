import { ValueObject } from '../ValueObject'
import { Result } from '../Result'
import { ValidationError } from '../errors/DomainError'

interface EmailProps {
  value: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props)
  }

  static create(value: string): Result<Email, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('Email cannot be empty', 'email'))
    }

    const normalized = value.trim().toLowerCase()

    if (!EMAIL_REGEX.test(normalized)) {
      return Result.fail(new ValidationError(`"${value}" is not a valid email address`, 'email'))
    }

    return Result.ok(new Email({ value: normalized }))
  }

  toString(): string {
    return this.props.value
  }
}
