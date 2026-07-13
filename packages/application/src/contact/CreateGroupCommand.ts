import { ContactGroup, Result, DomainError } from '@bcp/domain'
import { IGroupRepository } from '@bcp/contracts'

export interface CreateGroupInput {
  workspaceId: string
  name: string
  description?: string
}

export interface CreateGroupOutput {
  groupId: string
}

export class CreateGroupCommand {
  constructor(private readonly groupRepository: IGroupRepository) {}

  async execute(input: CreateGroupInput): Promise<Result<CreateGroupOutput, DomainError>> {
    const groupResult = ContactGroup.create(input.workspaceId, input.name, input.description)
    if (groupResult.isFail()) return Result.fail(groupResult.getError())
    const group = groupResult.getValue()

    const saveResult = await this.groupRepository.save(group)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok({ groupId: group.groupId.toString() })
  }
}
