import { ContactId, Result, DomainError } from '@bcp/domain'
import { IContactRepository, IEventBus } from '@bcp/contracts'

export interface ArchiveContactInput {
  contactId: string
  workspaceId: string
}

export class ArchiveContactCommand {
  constructor(
    private readonly contactRepository: IContactRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: ArchiveContactInput): Promise<Result<void, DomainError>> {
    const found = await this.contactRepository.findById(
      ContactId.from(input.contactId),
      input.workspaceId,
    )
    if (found.isFail()) return Result.fail(found.getError())
    const contact = found.getValue()

    const archiveResult = contact.archive()
    if (archiveResult.isFail()) return Result.fail(archiveResult.getError())

    const saveResult = await this.contactRepository.save(contact)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    await this.eventBus.publish(contact.clearDomainEvents())

    return Result.ok(undefined)
  }
}
