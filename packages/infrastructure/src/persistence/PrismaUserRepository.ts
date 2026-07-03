import type { PrismaClient } from '@prisma/client'
import { Result, NotFoundError, DomainError } from '@bcp/domain'
import type { IUserRepository, User } from '@bcp/contracts'

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const record = await this.prisma.user.findUnique({ where: { id } })
    if (!record) return Result.fail(new NotFoundError('User', id))
    return Result.ok(record)
  }

  async findByEmail(email: string): Promise<Result<User, NotFoundError>> {
    const record = await this.prisma.user.findUnique({ where: { email } })
    if (!record) return Result.fail(new NotFoundError('User', email))
    return Result.ok(record)
  }

  async save(user: User): Promise<Result<void, DomainError>> {
    await this.prisma.user.upsert({
      where: { id: user.id },
      create: user,
      update: user,
    })
    return Result.ok(undefined)
  }
}
