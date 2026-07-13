import { Result, ContactGroup, GroupId, NotFoundError } from '@bcp/domain'

export interface IGroupRepository {
  findById(id: GroupId, workspaceId: string): Promise<Result<ContactGroup, NotFoundError>>
  findByWorkspace(workspaceId: string): Promise<ContactGroup[]>
  save(group: ContactGroup): Promise<Result<void, NotFoundError>>
  addContact(groupId: string, contactId: string, workspaceId: string): Promise<void>
  removeContact(groupId: string, contactId: string, workspaceId: string): Promise<void>
}
