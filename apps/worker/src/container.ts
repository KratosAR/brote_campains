import Redis from 'ioredis'
import { Queue } from 'bullmq'
import { PrismaClient } from '@prisma/client'
import {
  PinoLogger,
  BullMQQueue,
  InMemoryEventBus,
  PrismaContactRepository,
  PrismaGroupRepository,
  PrismaTemplateRepository,
  PrismaCampaignRepository,
  PrismaDeliveryRepository,
} from '@bcp/infrastructure'
import { FakeProvider } from '@bcp/provider-fake'

import { Env } from './config/env'

// ponytail: solo dependencias planas (mismo criterio que apps/scheduler), sin DI framework.
// provider siempre FakeProvider en Sprint 6 — ProviderRegistry/ProviderOrchestrator es Sprint 7.
export function createContainer(env: Env) {
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null })
  const bullQueue = new Queue('default', { connection: redis })
  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL })

  return {
    prisma,
    redis,
    queue: new BullMQQueue(bullQueue),
    logger: new PinoLogger(),
    eventBus: new InMemoryEventBus(),
    contactRepository: new PrismaContactRepository(prisma),
    groupRepository: new PrismaGroupRepository(prisma),
    templateRepository: new PrismaTemplateRepository(prisma),
    campaignRepository: new PrismaCampaignRepository(prisma),
    deliveryRepository: new PrismaDeliveryRepository(prisma),
    provider: new FakeProvider(),
  }
}

export type Container = ReturnType<typeof createContainer>
