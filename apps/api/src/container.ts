import { asValue, createContainer, InjectionMode, AwilixContainer } from 'awilix'
import Redis from 'ioredis'
import { Queue } from 'bullmq'

import { ILogger, ICache, IEventBus, IQueue, ISecretManager } from '@bcp/contracts'
import { PinoLogger, InMemoryEventBus, EnvSecretManager, RedisCache, BullMQQueue } from '@bcp/infrastructure'

import { Env } from './config/env'

export interface Cradle {
  logger: ILogger
  cache: ICache
  eventBus: IEventBus
  queue: IQueue
  secretManager: ISecretManager
}

export function createDiContainer(env: Env): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY })

  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const bullQueue = new Queue('default', { connection: redis })

  container.register({
    logger: asValue(new PinoLogger()),
    cache: asValue(new RedisCache(redis)),
    eventBus: asValue(new InMemoryEventBus()),
    queue: asValue(new BullMQQueue(bullQueue)),
    secretManager: asValue(new EnvSecretManager()),
  })

  return container
}

export function resolve<K extends keyof Cradle>(container: AwilixContainer<Cradle>, token: K): Cradle[K] {
  return container.resolve(token)
}
