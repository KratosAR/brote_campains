import { asValue, createContainer, InjectionMode, AwilixContainer } from 'awilix'
import Redis from 'ioredis'
import { Queue } from 'bullmq'
import { PrismaClient } from '@prisma/client'

import {
  ILogger,
  ICache,
  IEventBus,
  IQueue,
  ISecretManager,
  IUserRepository,
  IWorkspaceRepository,
  IWorkspaceUserRepository,
  IRefreshTokenRepository,
  IInvitationRepository,
} from '@bcp/contracts'
import {
  PinoLogger,
  InMemoryEventBus,
  EnvSecretManager,
  RedisCache,
  BullMQQueue,
  PrismaWorkspaceRepository,
  PrismaUserRepository,
} from '@bcp/infrastructure'

import { Env } from './config/env'
import {
  InMemoryWorkspaceUserRepository,
  InMemoryRefreshTokenRepository,
  InMemoryInvitationRepository,
} from './repositories/InMemoryRepositories'

export interface Cradle {
  logger: ILogger
  cache: ICache
  eventBus: IEventBus
  queue: IQueue
  secretManager: ISecretManager
  workspaceRepository: IWorkspaceRepository
  userRepository: IUserRepository
  workspaceUserRepository: IWorkspaceUserRepository
  refreshTokenRepository: IRefreshTokenRepository
  invitationRepository: IInvitationRepository
}

export function createDiContainer(env: Env): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY })

  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const bullQueue = new Queue('default', { connection: redis })
  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL })

  container.register({
    logger: asValue(new PinoLogger()),
    cache: asValue(new RedisCache(redis)),
    eventBus: asValue(new InMemoryEventBus()),
    queue: asValue(new BullMQQueue(bullQueue)),
    secretManager: asValue(new EnvSecretManager()),
    workspaceRepository: asValue(new PrismaWorkspaceRepository(prisma)),
    userRepository: asValue(new PrismaUserRepository(prisma)),
    // ponytail: WorkspaceUser/RefreshToken/Invitation don't have repository
    // implementations yet (see apps/api/src/repositories/InMemoryRepositories.ts)
    workspaceUserRepository: asValue(new InMemoryWorkspaceUserRepository()),
    refreshTokenRepository: asValue(new InMemoryRefreshTokenRepository()),
    invitationRepository: asValue(new InMemoryInvitationRepository()),
  })

  return container
}

export function resolve<K extends keyof Cradle>(container: AwilixContainer<Cradle>, token: K): Cradle[K] {
  return container.resolve(token)
}
