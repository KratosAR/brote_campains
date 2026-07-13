import { Template, TemplateId, Result, NotFoundError } from '@bcp/domain'
import { ITemplateRepository } from '@bcp/contracts'

export interface GetTemplateInput {
  templateId: string
  workspaceId: string
}

export class GetTemplateQuery {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(input: GetTemplateInput): Promise<Result<Template, NotFoundError>> {
    return this.templateRepository.findById(TemplateId.from(input.templateId), input.workspaceId)
  }
}
