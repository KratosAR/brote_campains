import {
  ValidationError,
  NotFoundError,
  BusinessRuleViolationError,
  UnauthorizedError,
} from '../shared/errors/DomainError'

describe('ValidationError', () => {
  it('sets message, code, name and optional field', () => {
    const err = new ValidationError('bad value', 'email')
    expect(err.message).toBe('bad value')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.name).toBe('ValidationError')
    expect(err.field).toBe('email')
    expect(err).toBeInstanceOf(Error)
  })

  it('field is optional', () => {
    const err = new ValidationError('bad value')
    expect(err.field).toBeUndefined()
  })
})

describe('NotFoundError', () => {
  it('builds a message from entity and id', () => {
    const err = new NotFoundError('Campaign', '123')
    expect(err.message).toBe('Campaign with id "123" not found')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.name).toBe('NotFoundError')
  })
})

describe('BusinessRuleViolationError', () => {
  it('sets message, code and optional rule', () => {
    const err = new BusinessRuleViolationError('cannot exceed limit', 'max-limit')
    expect(err.message).toBe('cannot exceed limit')
    expect(err.code).toBe('BUSINESS_RULE_VIOLATION')
    expect(err.name).toBe('BusinessRuleViolationError')
    expect(err.rule).toBe('max-limit')
  })
})

describe('UnauthorizedError', () => {
  it('defaults message to "Unauthorized"', () => {
    const err = new UnauthorizedError()
    expect(err.message).toBe('Unauthorized')
    expect(err.code).toBe('UNAUTHORIZED')
    expect(err.name).toBe('UnauthorizedError')
  })

  it('accepts a custom message', () => {
    const err = new UnauthorizedError('no access')
    expect(err.message).toBe('no access')
  })
})
