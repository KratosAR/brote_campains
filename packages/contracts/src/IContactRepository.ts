import { Result, Contact, ContactId, NotFoundError } from '@bcp/domain'

export interface ContactSearchFilters {
  q?: string
  tags?: string[]
  groupId?: string
  status?: string
  acceptsCampaigns?: string
}

export interface Pagination {
  page: number
  limit: number
}

export interface Page<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface IContactRepository {
  findById(id: ContactId, workspaceId: string): Promise<Result<Contact, NotFoundError>>
  findByChannel(type: string, value: string, workspaceId: string): Promise<Result<Contact, NotFoundError>>
  findByExternalId(externalId: string, workspaceId: string): Promise<Result<Contact, NotFoundError>>
  search(workspaceId: string, filters: ContactSearchFilters, pagination: Pagination): Promise<Page<Contact>>
  findByGroup(groupId: string, workspaceId: string, pagination: Pagination): Promise<Page<Contact>>
  countByWorkspace(workspaceId: string): Promise<number>
  save(contact: Contact): Promise<Result<void, NotFoundError>>
  saveBatch(contacts: Contact[]): Promise<void>
}
