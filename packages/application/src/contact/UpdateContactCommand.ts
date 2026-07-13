import { ContactId, ContactIdentity, ContactChannel, ChannelType, Result, DomainError } from '@bcp/domain'
import { IContactRepository, IEventBus } from '@bcp/contracts'

export interface UpdateContactInput {
  contactId: string
  workspaceId: string
  identity?: {
    firstName: string
    lastName?: string
    company?: string
    externalId?: string
    notes?: string
  }
  channels?: {
    type: ChannelType
    value: string
    verified?: boolean
    isPrimary?: boolean
    remove?: boolean
  }[]
  tags?: string[]
}

export class UpdateContactCommand {
  constructor(
    private readonly contactRepository: IContactRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: UpdateContactInput): Promise<Result<void, DomainError>> {
    const found = await this.contactRepository.findById(
      ContactId.from(input.contactId),
      input.workspaceId,
    )
    if (found.isFail()) return Result.fail(found.getError())
    const contact = found.getValue()

    if (input.identity) {
      const identityResult = ContactIdentity.create(input.identity)
      if (identityResult.isFail()) return Result.fail(identityResult.getError())
      const updateResult = contact.updateIdentity(identityResult.getValue())
      if (updateResult.isFail()) return Result.fail(updateResult.getError())
    }

    for (const channelInput of input.channels ?? []) {
      if (channelInput.remove) {
        const removeResult = contact.removeChannel(channelInput.type)
        if (removeResult.isFail()) return Result.fail(removeResult.getError())
        continue
      }

      const channelResult = ContactChannel.create(channelInput.type, channelInput.value, {
        verified: channelInput.verified,
        isPrimary: channelInput.isPrimary,
      })
      if (channelResult.isFail()) return Result.fail(channelResult.getError())
      const addResult = contact.addChannel(channelResult.getValue())
      if (addResult.isFail()) return Result.fail(addResult.getError())
    }

    for (const tag of input.tags ?? []) {
      contact.addTag(tag)
    }

    const saveResult = await this.contactRepository.save(contact)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    await this.eventBus.publish(contact.clearDomainEvents())

    return Result.ok(undefined)
  }
}
