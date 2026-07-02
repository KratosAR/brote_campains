import { Result } from '@bcp/domain'
import { NotFoundError, DomainError } from '@bcp/domain'

export interface IRepository<T, ID> {
  findById(id: ID): Promise<Result<T, NotFoundError>>
  save(entity: T): Promise<Result<void, DomainError>>
  delete(id: ID): Promise<Result<void, DomainError>>
}
