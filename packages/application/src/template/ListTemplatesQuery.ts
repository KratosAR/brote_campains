import { Template } from '@bcp/domain'
import { ITemplateRepository, Page } from '@bcp/contracts'

export interface ListTemplatesInput {
  workspaceId: string
  channel?: string
  status?: string
  page: number
  limit: number
}

export class ListTemplatesQuery {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(input: ListTemplatesInput): Promise<Page<Template>> {
    return this.templateRepository.list(
      input.workspaceId,
      { channel: input.channel, status: input.status },
      { page: input.page, limit: input.limit },
    )
  }
}
