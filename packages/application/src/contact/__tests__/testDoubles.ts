import { Result, NotFoundError, Contact, ContactId, ContactGroup, GroupId, DomainEvent } from '@bcp/domain'
import { IContactRepository, ContactSearchFilters, Pagination, Page } from '@bcp/contracts'
import { IGroupRepository } from '@bcp/contracts'
import { IEventBus } from '@bcp/contracts'

export class InMemoryContactRepository implements IContactRepository {
  readonly contacts = new Map<string, Contact>()

  async findById(id: ContactId, workspaceId: string): Promise<Result<Contact, NotFoundError>> {
    const found = this.contacts.get(id.toString())
    if (!found || found.workspaceId !== workspaceId) {
      return Result.fail(new NotFoundError('Contact', id.toString()))
    }
    return Result.ok(found)
  }

  async findByChannel(type: string, value: string, workspaceId: string): Promise<Result<Contact, NotFoundError>> {
    const found = [...this.contacts.values()].find(
      (c) =>
        c.workspaceId === workspaceId &&
        c.channels.some((ch) => ch.type === type && ch.value === value),
    )
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Contact', value))
  }

  async findByExternalId(externalId: string, workspaceId: string): Promise<Result<Contact, NotFoundError>> {
    const found = [...this.contacts.values()].find(
      (c) => c.workspaceId === workspaceId && c.identity.externalId === externalId,
    )
    return found ? Result.ok(found) : Result.fail(new NotFoundError('Contact', externalId))
  }

  async search(
    workspaceId: string,
    _filters: ContactSearchFilters,
    pagination: Pagination,
  ): Promise<Page<Contact>> {
    const items = [...this.contacts.values()].filter((c) => c.workspaceId === workspaceId)
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

export class InMemoryGroupRepository implements IGroupRepository {
  readonly groups = new Map<string, ContactGroup>()
  readonly memberships = new Map<string, Set<string>>()

  async findById(id: GroupId, workspaceId: string): Promise<Result<ContactGroup, NotFoundError>> {
    const found = this.groups.get(id.toString())
    if (!found || found.workspaceId !== workspaceId) {
      return Result.fail(new NotFoundError('ContactGroup', id.toString()))
    }
    return Result.ok(found)
  }

  async findByWorkspace(workspaceId: string): Promise<ContactGroup[]> {
    return [...this.groups.values()].filter((g) => g.workspaceId === workspaceId)
  }

  async save(group: ContactGroup): Promise<Result<void, NotFoundError>> {
    this.groups.set(group.groupId.toString(), group)
    return Result.ok(undefined)
  }

  async addContact(groupId: string, contactId: string): Promise<void> {
    const set = this.memberships.get(groupId) ?? new Set<string>()
    set.add(contactId)
    this.memberships.set(groupId, set)
  }

  async removeContact(groupId: string, contactId: string): Promise<void> {
    this.memberships.get(groupId)?.delete(contactId)
  }
}

export class NoopEventBus implements IEventBus {
  readonly published: DomainEvent[] = []

  async publish(events: DomainEvent[]): Promise<void> {
    this.published.push(...events)
  }

  subscribe(): void {}
}
