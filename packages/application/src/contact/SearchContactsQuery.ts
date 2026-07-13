import { Contact } from '@bcp/domain'
import { IContactRepository, Page } from '@bcp/contracts'

export interface SearchContactsInput {
  workspaceId: string
  q?: string
  tags?: string[]
  groupId?: string
  status?: string
  acceptsCampaigns?: string
  page: number
  limit: number
}

export class SearchContactsQuery {
  constructor(private readonly contactRepository: IContactRepository) {}

  async execute(input: SearchContactsInput): Promise<Page<Contact>> {
    return this.contactRepository.search(
      input.workspaceId,
      {
        q: input.q,
        tags: input.tags,
        groupId: input.groupId,
        status: input.status,
        acceptsCampaigns: input.acceptsCampaigns,
      },
      { page: input.page, limit: input.limit },
    )
  }
}
