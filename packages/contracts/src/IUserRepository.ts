import { Result, NotFoundError, DomainError } from '@bcp/domain'

// ponytail: no domain User aggregate exists yet (Sprint 2 only added WorkspaceUser/UserId).
// This is a plain persistence record, not a domain entity — upgrade to an aggregate if
// User grows business logic (e.g. password change rules) beyond storage.
export interface User {
  id: string
  email: string
  passwordHash: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface IUserRepository {
  findById(id: string): Promise<Result<User, NotFoundError>>
  findByEmail(email: string): Promise<Result<User, NotFoundError>>
  save(user: User): Promise<Result<void, DomainError>>
}
