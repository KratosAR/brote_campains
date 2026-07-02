export { UniqueId } from './shared/UniqueId'
export { IClock, SystemClock, FixedClock } from './shared/Clock'
export { Result } from './shared/Result'
export { ValueObject } from './shared/ValueObject'
export { Entity } from './shared/Entity'
export { AggregateRoot } from './shared/AggregateRoot'
export { DomainEvent } from './shared/DomainEvent'
export { Specification, AndSpecification, OrSpecification, NotSpecification } from './shared/Specification'
export {
  DomainError,
  ValidationError,
  NotFoundError,
  BusinessRuleViolationError,
  UnauthorizedError,
} from './shared/errors/DomainError'
export { Email } from './shared/value-objects/Email'
export { PhoneNumber } from './shared/value-objects/PhoneNumber'
