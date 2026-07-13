import { TemplateId, TemplateContent, Result, DomainError } from '@bcp/domain'
import { ITemplateRepository } from '@bcp/contracts'

export interface UpdateTemplateInput {
  templateId: string
  workspaceId: string
  body: string
  createdBy?: string
}

export class UpdateTemplateCommand {
  constructor(private readonly templateRepository: ITemplateRepository) {}

  async execute(input: UpdateTemplateInput): Promise<Result<void, DomainError>> {
    const found = await this.templateRepository.findById(
      TemplateId.from(input.templateId),
      input.workspaceId,
    )
    if (found.isFail()) return Result.fail(found.getError())
    const template = found.getValue()

    const contentResult = TemplateContent.create(input.body)
    if (contentResult.isFail()) return Result.fail(contentResult.getError())

    // ponytail: crea una versión nueva, NO activa la anterior — spec pide inmutabilidad de
    // versiones existentes. Activar la versión nueva es un caso aparte (activateVersion) fuera
    // de este sprint.
    const versionResult = template.createVersion(contentResult.getValue(), input.createdBy)
    if (versionResult.isFail()) return Result.fail(versionResult.getError())

    const saveResult = await this.templateRepository.save(template)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
