import Redis from 'ioredis'
import { Queue } from 'bullmq'
import { PinoLogger, BullMQQueue } from '@bcp/infrastructure'

import { Env } from './config/env'

// ponytail: solo dependencias planas (mismo criterio que apps/worker/apps/scheduler), sin DI framework.
export function createContainer(env: Env) {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const bullQueue = new Queue('default', { connection: redis })

  return {
    redis,
    queue: new BullMQQueue(bullQueue),
    logger: new PinoLogger(),
  }
}

export type Container = ReturnType<typeof createContainer>
