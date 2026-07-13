import {
  Contact,
  ContactChannel,
  ContactIdentity,
  ChannelType,
  Result,
  DomainError,
} from '@bcp/domain'
import { IContactRepository, IEventBus } from '@bcp/contracts'

export interface CreateContactChannelInput {
  type: ChannelType
  value: string
  verified?: boolean
  isPrimary?: boolean
}

export interface CreateContactInput {
  workspaceId: string
  identity: {
    firstName: string
    lastName?: string
    company?: string
    externalId?: string
    notes?: string
  }
  channels: CreateContactChannelInput[]
  tags?: string[]
  // ponytail: groupIds recibido pero no aplicado — IGroupRepository.addContact no ajusta
  // contactCount solo, y hacerlo bien acá duplicaría AddContactToGroupCommand. Usar ese
  // command aparte hasta que haga falta crear-y-agrupar en un solo paso.
  groupIds?: string[]
}

export interface CreateContactOutput {
  contactId: string
}

export class CreateContactCommand {
  constructor(
    private readonly contactRepository: IContactRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: CreateContactInput): Promise<Result<CreateContactOutput, DomainError>> {
    const identityResult = ContactIdentity.create(input.identity)
    if (identityResult.isFail()) return Result.fail(identityResult.getError())

    const channels: ContactChannel[] = []
    for (const channelInput of input.channels) {
      const channelResult = ContactChannel.create(channelInput.type, channelInput.value, {
        verified: channelInput.verified,
        isPrimary: channelInput.isPrimary,
      })
      if (channelResult.isFail()) return Result.fail(channelResult.getError())
      channels.push(channelResult.getValue())
    }

    const contactResult = Contact.create(input.workspaceId, identityResult.getValue(), channels)
    if (contactResult.isFail()) return Result.fail(contactResult.getError())
    const contact = contactResult.getValue()

    for (const tag of input.tags ?? []) {
      contact.addTag(tag)
    }

    const saveResult = await this.contactRepository.save(contact)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    await this.eventBus.publish(contact.clearDomainEvents())

    return Result.ok({ contactId: contact.contactId.toString() })
  }
}
