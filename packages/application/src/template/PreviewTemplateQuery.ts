import { TemplateId, Result, DomainError, NotFoundError } from '@bcp/domain'
import { ITemplateRepository } from '@bcp/contracts'

export interface PreviewTemplateInput {
  templateId: string
  workspaceId: string
  version?: number
  sampleValues: Record<string, string>
}

export class PreviewTemplateQuery {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(input: PreviewTemplateInput): Promise<Result<string, DomainError>> {
    const found = await this.templateRepository.findById(
      TemplateId.from(input.templateId),
      input.workspaceId,
    )
    if (found.isFail()) return Result.fail(found.getError())
    const template = found.getValue()

    if (input.version === undefined) {
      return template.getActiveContent().render(input.sampleValues)
    }

    const templateVersion = template.versions.find((v) => v.version === input.version)
    if (!templateVersion) {
      return Result.fail(new NotFoundError('TemplateVersion', input.version.toString()))
    }

    return templateVersion.content.render(input.sampleValues)
  }
}
