import { AwilixContainer } from 'awilix'
import {
  Result,
  NotFoundError,
  DomainError,
  Workspace,
  WorkspaceId,
  Contact,
  ContactId,
  ContactGroup,
  GroupId,
  Template,
  TemplateId,
  Campaign,
  CampaignId,
  CampaignStatus,
  ChannelConnection,
  ChannelConnectionId,
  ChannelType,
} from '@bcp/domain'
import {
  IUserRepository,
  User,
  IWorkspaceRepository,
  IEventBus,
  IContactRepository,
  IGroupRepository,
  ITemplateRepository,
  ICampaignRepository,
  IChannelConnectionRepository,
  TemplateListFilters,
  ContactSearchFilters,
  Pagination,
  Page,
  MessagingProvider,
  HealthStatus,
  ProviderCapabilities,
} from '@bcp/contracts'
import { ProviderRegistry, ProviderOrchestrator, CredentialEncryption } from '@bcp/infrastructure'

import { Cradle } from '../container'
import {
  InMemoryWorkspaceUserRepository,
  InMemoryRefreshTokenRepository,
  InMemoryInvitationRepository,
} from '../repositories/InMemoryRepositories'

class InMemoryUserRepository implements IUserRepository {
  readonly users = new Map<string, User>()

  async findById(id: string): Promise<Result<User, NotFoundError>> {
    const user = this.users.get(id)
    return user ? Result.ok(user) : Result.fail(new NotFoundError('User', id))
  }

  async findByEmail(email: string): Promise<Result<User, NotFoundError>> {
    const user = [...this.users.values()].find((u) => u.email === email)
    return user ? Result.ok(user) : Result.fail(new NotFoundError('User', email))
  }

  async save(user: User): Promise<Result<void, DomainError>> {
    this.users.set(user.id, user)
    return Result.ok(undefined)
  }
}

class InMemoryWorkspaceRepository implements IWorkspaceRepository {
  readonly workspaces = new Map<string, Workspace>()

  async findById(id: WorkspaceId): Promise<Result<Workspace, NotFoundError>> {
    const found = this.workspaces.get(id.toString())
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Workspace', id.toString()))
  }

  async findBySlug(slug: string): Promise<Result<Workspace, NotFoundError>> {
    const found = [...this.workspaces.values()].find((w) => w.slug === slug)
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Workspace', slug))
  }

  async existsBySlug(slug: string): Promise<boolean> {
    return [...this.workspaces.values()].some((w) => w.slug === slug)
  }

  async save(workspace: Workspace): Promise<Result<void, DomainError>> {
    this.workspaces.set(workspace.workspaceId.toString(), workspace)
    return Result.ok(undefined)
  }

  async delete(id: WorkspaceId): Promise<Result<void, DomainError>> {
    this.workspaces.delete(id.toString())
    return Result.ok(undefined)
  }
}

class NoopEventBus implements IEventBus {
  async publish(): Promise<void> {}
  subscribe(): void {}
}

// ponytail: in-memory stand-ins for HTTP integration tests only — no Postgres
// needed. Same rationale as InMemoryRepositories.ts above. Swap for
// PrismaContactRepository/PrismaGroupRepository-backed fixtures if a test
// ever needs real query/pagination semantics.
class InMemoryContactRepository implements IContactRepository {
  readonly contacts = new Map<string, Contact>()

  async findById(id: ContactId, workspaceId: string): Promise<Result<Contact, NotFoundError>> {
    const found = this.contacts.get(id.toString())
    return found && found.workspaceId === workspaceId
      ? Result.ok(found)
      : Result.fail(new NotFoundError('Contact', id.toString()))
  }

  async findByChannel(type: string, value: string, workspaceId: string): Promise<Result<Contact, NotFoundError>> {
    const found = [...this.contacts.values()].find(
      (c) => c.workspaceId === workspaceId && c.channels.some((ch) => ch.type === type && ch.value === value),
    )
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Contact', value))
  }

  async findByExternalId(externalId: string, workspaceId: string): Promise<Result<Contact, NotFoundError>> {
    const found = [...this.contacts.values()].find(
      (c) => c.workspaceId === workspaceId && c.identity.externalId === externalId,
    )
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Contact', externalId))
  }

  async search(workspaceId: string, filters: ContactSearchFilters, pagination: Pagination): Promise<Page<Contact>> {
    const items = [...this.contacts.values()].filter((c) => {
      if (c.workspaceId !== workspaceId) return false
      if (filters.status && c.status !== filters.status) return false
      if (filters.groupId) return false // ponytail: group membership not tracked here, not exercised by these tests
      return true
    })
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async findByGroup(_groupId: string, workspaceId: string, pagination: Pagination): Promise<Page<Contact>> {
    const items = [...this.contacts.values()].filter((c) => c.workspaceId === workspaceId)
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async countByWorkspace(workspaceId: string): Promise<number> {
    return [...this.contacts.values()].filter((c) => c.workspaceId === workspaceId).length
  }

  async save(contact: Contact): Promise<Result<void, NotFoundError>> {
    this.contacts.set(contact.contactId.toString(), contact)
    return Result.ok(undefined)
  }

  async saveBatch(contacts: Contact[]): Promise<void> {
    for (const contact of contacts) this.contacts.set(contact.contactId.toString(), contact)
  }
}

class InMemoryGroupRepository implements IGroupRepository {
  readonly groups = new Map<string, ContactGroup>()
  private readonly memberships = new Set<string>()

  async findById(id: GroupId, workspaceId: string): Promise<Result<ContactGroup, NotFoundError>> {
    const found = this.groups.get(id.toString())
    return found && found.workspaceId === workspaceId
      ? Result.ok(found)
      : Result.fail(new NotFoundError('Group', id.toString()))
  }

  async findByWorkspace(workspaceId: string): Promise<ContactGroup[]> {
    return [...this.groups.values()].filter((g) => g.workspaceId === workspaceId)
  }

  async save(group: ContactGroup): Promise<Result<void, NotFoundError>> {
    this.groups.set(group.groupId.toString(), group)
    return Result.ok(undefined)
  }

  async addContact(groupId: string, contactId: string): Promise<void> {
    this.memberships.add(`${groupId}:${contactId}`)
  }

  async removeContact(groupId: string, contactId: string): Promise<void> {
    this.memberships.delete(`${groupId}:${contactId}`)
  }
}

// ponytail: in-memory stand-in for HTTP integration tests only — same rationale
// as InMemoryContactRepository above.
class InMemoryTemplateRepository implements ITemplateRepository {
  readonly templates = new Map<string, Template>()

  async findById(id: TemplateId, workspaceId: string): Promise<Result<Template, NotFoundError>> {
    const found = this.templates.get(id.toString())
    return found && found.workspaceId === workspaceId
      ? Result.ok(found)
      : Result.fail(new NotFoundError('Template', id.toString()))
  }

  async list(workspaceId: string, filters: TemplateListFilters, pagination: Pagination): Promise<Page<Template>> {
    const items = [...this.templates.values()].filter((t) => {
      if (t.workspaceId !== workspaceId) return false
      if (filters.channel && t.channel !== filters.channel) return false
      if (filters.status && t.status !== filters.status) return false
      return true
    })
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async save(template: Template): Promise<Result<void, NotFoundError>> {
    this.templates.set(template.templateId.toString(), template)
    return Result.ok(undefined)
  }
}

// ponytail: in-memory stand-in for HTTP integration tests only — same rationale
// as InMemoryContactRepository above. findScheduledBefore/findRunning aren't
// exercised by the campaigns router yet (no sender job in this sprint), so
// they return empty rather than filtering — extend when a sender endpoint needs them.
class InMemoryCampaignRepository implements ICampaignRepository {
  readonly campaigns = new Map<string, Campaign>()

  async findById(id: CampaignId, workspaceId: string): Promise<Result<Campaign, NotFoundError>> {
    const found = this.campaigns.get(id.toString())
    return found && found.workspaceId === workspaceId
      ? Result.ok(found)
      : Result.fail(new NotFoundError('Campaign', id.toString()))
  }

  async findByStatus(
    workspaceId: string,
    statuses: CampaignStatus[],
    pagination: Pagination,
  ): Promise<Page<Campaign>> {
    const items = [...this.campaigns.values()].filter(
      (c) => c.workspaceId === workspaceId && statuses.includes(c.status),
    )
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async findScheduledBefore(): Promise<Campaign[]> {
    return []
  }

  async findRunning(): Promise<Campaign[]> {
    return []
  }

  async save(campaign: Campaign): Promise<Result<void, NotFoundError>> {
    this.campaigns.set(campaign.campaignId.toString(), campaign)
    return Result.ok(undefined)
  }
}

// ponytail: in-memory stand-in for HTTP integration tests only — same rationale
// as InMemoryContactRepository above.
class InMemoryChannelConnectionRepository implements IChannelConnectionRepository {
  readonly connections = new Map<string, ChannelConnection>()

  async findById(id: ChannelConnectionId, workspaceId: string): Promise<Result<ChannelConnection, NotFoundError>> {
    const found = this.connections.get(id.toString())
    return found && found.workspaceId === workspaceId
      ? Result.ok(found)
      : Result.fail(new NotFoundError('ChannelConnection', id.toString()))
  }

  async findByWorkspace(workspaceId: string): Promise<ChannelConnection[]> {
    return [...this.connections.values()].filter((c) => c.workspaceId === workspaceId)
  }

  async findByChannel(workspaceId: string, channel: ChannelType): Promise<ChannelConnection[]> {
    return [...this.connections.values()].filter((c) => c.workspaceId === workspaceId && c.channel === channel)
  }

  async save(connection: ChannelConnection): Promise<Result<void, NotFoundError>> {
    this.connections.set(connection.connectionId.toString(), connection)
    return Result.ok(undefined)
  }
}

// ponytail: proveedor de test controlable — 'test-ok' siempre conecta, 'test-fail' simula
// credenciales inválidas (connect() rechaza). Evita golpear Meta/Evolution reales en tests.
class TestProvider implements MessagingProvider {
  constructor(
    readonly providerId: string,
    private readonly shouldFail: boolean,
  ) {}

  capabilities(): ProviderCapabilities {
    return { supportsTemplates: false, supportsMedia: false, supportsButtons: false, maxMessagesPerMinute: 100 }
  }

  async connect(): Promise<void> {
    if (this.shouldFail) throw new Error('invalid credentials')
  }

  async send() {
    return { providerMessageId: 'test-msg', timestamp: new Date() }
  }

  async health(): Promise<HealthStatus> {
    return this.shouldFail ? { status: 'offline', latencyMs: 1 } : { status: 'online', latencyMs: 1 }
  }
}

/** In-memory Cradle for HTTP integration tests — no Redis/Postgres required. */
export function createTestContainer(): AwilixContainer<Cradle> {
  const channelConnectionRepository = new InMemoryChannelConnectionRepository()
  const providerRegistry = new ProviderRegistry()
  providerRegistry.register(new TestProvider('test-ok', false))
  providerRegistry.register(new TestProvider('test-fail', true))

  const cradle: Cradle = {
    logger: { info() {}, warn() {}, error() {}, debug() {} },
    cache: {
      get: async () => null,
      set: async () => {},
      delete: async () => {},
    } as unknown as Cradle['cache'],
    eventBus: new NoopEventBus(),
    queue: { add: async () => {} } as unknown as Cradle['queue'],
    secretManager: { getSecret: async () => '' } as unknown as Cradle['secretManager'],
    workspaceRepository: new InMemoryWorkspaceRepository(),
    userRepository: new InMemoryUserRepository(),
    workspaceUserRepository: new InMemoryWorkspaceUserRepository(),
    refreshTokenRepository: new InMemoryRefreshTokenRepository(),
    invitationRepository: new InMemoryInvitationRepository(),
    contactRepository: new InMemoryContactRepository(),
    groupRepository: new InMemoryGroupRepository(),
    templateRepository: new InMemoryTemplateRepository(),
    campaignRepository: new InMemoryCampaignRepository(),
    deliveryRepository: {
      findById: async () => Result.fail(new NotFoundError('Delivery', 'test')),
      findByProviderMessageId: async () => null,
      findByCampaign: async () => ({ items: [], total: 0, page: 1, limit: 100000 }),
      countByCampaignAndStatus: async () => ({}),
      save: async () => Result.ok(undefined),
      saveBatch: async () => {},
    } as unknown as Cradle['deliveryRepository'],
    channelConnectionRepository,
    credentialEncryption: new CredentialEncryption('test-encryption-key-32-characters'),
    providerRegistry,
    providerOrchestrator: new ProviderOrchestrator(providerRegistry, channelConnectionRepository),
  }

  return { resolve: (key: keyof Cradle) => cradle[key] } as unknown as AwilixContainer<Cradle>
}
