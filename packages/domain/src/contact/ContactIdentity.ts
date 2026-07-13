import { ValueObject } from '../shared/ValueObject'
import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'

interface ContactIdentityProps {
  firstName: string
  lastName?: string
  company?: string
  externalId?: string
  notes?: string
}

export class ContactIdentity extends ValueObject<ContactIdentityProps> {
  private constructor(props: ContactIdentityProps) {
    super(props)
  }

  static create(props: ContactIdentityProps): Result<ContactIdentity, ValidationError> {
    if (!props.firstName || props.firstName.trim().length === 0) {
      return Result.fail(new ValidationError('First name cannot be empty', 'firstName'))
    }

    return Result.ok(
      new ContactIdentity({
        firstName: props.firstName.trim(),
        lastName: props.lastName?.trim(),
        company: props.company?.trim(),
        externalId: props.externalId?.trim(),
        notes: props.notes?.trim(),
      }),
    )
  }

  get firstName(): string {
    return this.props.firstName
  }

  get lastName(): string | undefined {
    return this.props.lastName
  }

  get company(): string | undefined {
    return this.props.company
  }

  get externalId(): string | undefined {
    return this.props.externalId
  }

  get notes(): string | undefined {
    return this.props.notes
  }

  get fullName(): string {
    return [this.props.firstName, this.props.lastName].filter(Boolean).join(' ')
  }
}
