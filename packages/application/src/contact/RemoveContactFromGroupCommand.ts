import { GroupId, Result, DomainError } from '@bcp/domain'
import { IGroupRepository } from '@bcp/contracts'

export interface RemoveContactFromGroupInput {
  contactId: string
  groupId: string
  workspaceId: string
}

export class RemoveContactFromGroupCommand {
  constructor(private readonly groupRepository: IGroupRepository) {}

  async execute(input: RemoveContactFromGroupInput): Promise<Result<void, DomainError>> {
    const found = await this.groupRepository.findById(GroupId.from(input.groupId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const group = found.getValue()

    await this.groupRepository.removeContact(input.groupId, input.contactId, input.workspaceId)

    group.decrementContactCount()
    const saveResult = await this.groupRepository.save(group)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok(undefined)
  }
}
