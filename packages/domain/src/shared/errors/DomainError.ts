export abstract class DomainError extends Error {
  abstract readonly code: string

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends DomainError {
  readonly code = 'VALIDATION_ERROR'

  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message)
  }
}

export class NotFoundError extends DomainError {
  readonly code = 'NOT_FOUND'

  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found`)
  }
}

export class BusinessRuleViolationError extends DomainError {
  readonly code = 'BUSINESS_RULE_VIOLATION'

  constructor(
    message: string,
    readonly rule?: string,
  ) {
    super(message)
  }
}

export class UnauthorizedError extends DomainError {
  readonly code = 'UNAUTHORIZED'

  constructor(message = 'Unauthorized') {
    super(message)
  }
}
