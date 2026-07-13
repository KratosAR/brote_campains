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
  IContactRepository,
  IGroupRepository,
  ITemplateRepository,
  ICampaignRepository,
  IChannelConnectionRepository,
  IDeliveryRepository,
} from '@bcp/contracts'
import {
  PinoLogger,
  InMemoryEventBus,
  EnvSecretManager,
  RedisCache,
  BullMQQueue,
  PrismaWorkspaceRepository,
  PrismaUserRepository,
  PrismaContactRepository,
  PrismaGroupRepository,
  PrismaTemplateRepository,
  PrismaCampaignRepository,
  PrismaChannelConnectionRepository,
  PrismaDeliveryRepository,
  CredentialEncryption,
  ProviderRegistry,
  ProviderOrchestrator,
} from '@bcp/infrastructure'
import { MetaProvider } from '@bcp/provider-meta'
import { EvolutionProvider } from '@bcp/provider-evolution'

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
  contactRepository: IContactRepository
  groupRepository: IGroupRepository
  templateRepository: ITemplateRepository
  campaignRepository: ICampaignRepository
  deliveryRepository: IDeliveryRepository
  channelConnectionRepository: IChannelConnectionRepository
  credentialEncryption: CredentialEncryption
  providerRegistry: ProviderRegistry
  providerOrchestrator: ProviderOrchestrator
}

export function createDiContainer(env: Env): AwilixContainer<Cradle> {
  const container = createContainer<Cradle>({ injectionMode: InjectionMode.PROXY })

  const redis = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    enableOfflineQueue: true,
    lazyConnect: false,
  })
  const bullQueue = new Queue('default', { connection: redis })
  const prisma = new PrismaClient({ datasourceUrl: env.DATABASE_URL })

  const credentialEncryption = new CredentialEncryption(env.ENCRYPTION_KEY)
  const channelConnectionRepository = new PrismaChannelConnectionRepository(prisma, credentialEncryption)
  const providerRegistry = new ProviderRegistry()
  // La config de env vars acá es solo el fallback cuando una ChannelConnection no trae
  // credentials propias. connect()/send()/health() reciben las credenciales por-conexión
  // (ChannelConnection.credentials, ya descifradas) y las usan en vez de esta config estática.
  providerRegistry.register(
    new MetaProvider({
      phoneNumberId: process.env.META_PHONE_NUMBER_ID ?? '',
      accessToken: process.env.META_ACCESS_TOKEN ?? '',
      webhookVerifyToken: process.env.META_WEBHOOK_VERIFY_TOKEN ?? '',
    }),
  )
  providerRegistry.register(
    new EvolutionProvider({
      baseUrl: process.env.EVOLUTION_BASE_URL ?? '',
      apiKey: process.env.EVOLUTION_API_KEY ?? '',
      instanceName: process.env.EVOLUTION_INSTANCE_NAME ?? '',
    }),
  )

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
    contactRepository: asValue(new PrismaContactRepository(prisma)),
    groupRepository: asValue(new PrismaGroupRepository(prisma)),
    templateRepository: asValue(new PrismaTemplateRepository(prisma)),
    campaignRepository: asValue(new PrismaCampaignRepository(prisma)),
    deliveryRepository: asValue(new PrismaDeliveryRepository(prisma)),
    channelConnectionRepository: asValue(channelConnectionRepository),
    credentialEncryption: asValue(credentialEncryption),
    providerRegistry: asValue(providerRegistry),
    providerOrchestrator: asValue(new ProviderOrchestrator(providerRegistry, channelConnectionRepository)),
  })

  return container
}

export function resolve<K extends keyof Cradle>(container: AwilixContainer<Cradle>, token: K): Cradle[K] {
  return container.resolve(token)
}
