import { parsePhoneNumber, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js'
import { ValueObject } from '../ValueObject'
import { Result } from '../Result'
import { ValidationError } from '../errors/DomainError'

interface PhoneNumberProps {
  e164: string
  countryCode: string
  nationalNumber: string
}

export class PhoneNumber extends ValueObject<PhoneNumberProps> {
  private constructor(props: PhoneNumberProps) {
    super(props)
  }

  static create(
    value: string,
    defaultCountry: CountryCode = 'AR',
  ): Result<PhoneNumber, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('Phone number cannot be empty', 'phone'))
    }

    try {
      const parsed = parsePhoneNumber(value.trim(), defaultCountry)

      if (!parsed || !isValidPhoneNumber(value.trim(), defaultCountry)) {
        return Result.fail(
          new ValidationError(`"${value}" is not a valid phone number`, 'phone'),
        )
      }

      return Result.ok(
        new PhoneNumber({
          e164: parsed.format('E.164'),
          countryCode: parsed.countryCallingCode,
          nationalNumber: parsed.nationalNumber,
        }),
      )
    } catch {
      return Result.fail(new ValidationError(`"${value}" is not a valid phone number`, 'phone'))
    }
  }

  toE164(): string {
    return this.props.e164
  }

  toString(): string {
    return this.props.e164
  }
}
