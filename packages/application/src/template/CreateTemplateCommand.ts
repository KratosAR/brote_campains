import { Template, TemplateContent, ChannelType, Result, DomainError } from '@bcp/domain'
import { ITemplateRepository } from '@bcp/contracts'

export interface CreateTemplateInput {
  workspaceId: string
  name: string
  channel: ChannelType
  body: string
  createdBy?: string
  description?: string
}

export interface CreateTemplateOutput {
  templateId: string
}

export class CreateTemplateCommand {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(input: CreateTemplateInput): Promise<Result<CreateTemplateOutput, DomainError>> {
    const contentResult = TemplateContent.create(input.body)
    if (contentResult.isFail()) return Result.fail(contentResult.getError())

    const templateResult = Template.create(
      input.workspaceId,
      input.name,
      input.channel,
      contentResult.getValue(),
      input.createdBy,
      input.description,
    )
    if (templateResult.isFail()) return Result.fail(templateResult.getError())
    const template = templateResult.getValue()

    const saveResult = await this.templateRepository.save(template)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok({ templateId: template.templateId.toString() })
  }
}
