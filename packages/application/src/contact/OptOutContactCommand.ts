import { ContactId, Result, DomainError } from '@bcp/domain'
import { IContactRepository, IEventBus } from '@bcp/contracts'

export interface OptOutContactInput {
  contactId: string
  workspaceId: string
}

export class OptOutContactCommand {
  constructor(
    private readonly contactRepository: IContactRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: OptOutContactInput): Promise<Result<void, DomainError>> {
    const found = await this.contactRepository.findById(
      ContactId.from(input.contactId),
      input.workspaceId,
    )
    if (found.isFail()) return Result.fail(found.getError())
    const contact = found.getValue()

    const optOutResult = contact.optOut()
    if (optOutResult.isFail()) return Result.fail(optOutResult.getError())

    const saveResult = await this.contactRepository.save(contact)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    await this.eventBus.publish(contact.clearDomainEvents())

    return Result.ok(undefined)
  }
}
