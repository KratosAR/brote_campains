import { TemplateId, Result, DomainError } from '@bcp/domain'
import { ITemplateRepository } from '@bcp/contracts'

export interface ArchiveTemplateInput {
  templateId: string
  workspaceId: string
}

export class ArchiveTemplateCommand {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(input: ArchiveTemplateInput): Promise<Result<void, DomainError>> {
    const found = await this.templateRepository.findById(
      TemplateId.from(input.templateId),
      input.workspaceId,
    )
    if (found.isFail()) return Result.fail(found.getError())
    const template = found.getValue()

    const archiveResult = template.archive()
    if (archiveResult.isFail()) return Result.fail(archiveResult.getError())

    const saveResult = await this.templateRepository.save(template)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
