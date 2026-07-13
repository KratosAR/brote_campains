import { Contact, ContactId, Result, NotFoundError } from '@bcp/domain'
import { IContactRepository } from '@bcp/contracts'

export interface GetContactInput {
  contactId: string
  workspaceId: string
}

export class GetContactQuery {
  constructor(private readonly contactRepository: IContactRepository) {}

  async execute(input: GetContactInput): Promise<Result<Contact, NotFoundError>> {
    return this.contactRepository.findById(ContactId.from(input.contactId), input.workspaceId)
  }
}
