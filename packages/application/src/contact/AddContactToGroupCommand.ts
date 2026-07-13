import { GroupId, Result, DomainError } from '@bcp/domain'
import { IGroupRepository } from '@bcp/contracts'

export interface AddContactToGroupInput {
  contactId: string
  groupId: string
  workspaceId: string
}

export class AddContactToGroupCommand {
  constructor(private readonly groupRepository: IGroupRepository) {}

  async execute(input: AddContactToGroupInput): Promise<Result<void, DomainError>> {
    const found = await this.groupRepository.findById(GroupId.from(input.groupId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const group = found.getValue()

    await this.groupRepository.addContact(input.groupId, input.contactId, input.workspaceId)

    group.incrementContactCount()
    const saveResult = await this.groupRepository.save(group)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
