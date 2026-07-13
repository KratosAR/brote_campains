import Redis from 'ioredis'
import { Queue } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import { PinoLogger, BullMQQueue } from '@bcp/infrastructure'

import { Env } from './config/env'

// ponytail: solo 3 dependencias (prisma/queue/logger), un objeto literal alcanza —
// awilix con su Cradle/proxy es de más para este proceso. Escalar a DI real si
// el scheduler crece más allá de este único job.
export function createContainer(env: Env) {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const bullQueue = new Queue('default', { connection: redis })
  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL })

  return {
    prisma,
    queue: new BullMQQueue(bullQueue),
    logger: new PinoLogger(),
  }
}

export type Container = ReturnType<typeof createContainer>
