import { CreateGroupCommand } from '../CreateGroupCommand'
import { AddContactToGroupCommand } from '../AddContactToGroupCommand'
import { RemoveContactFromGroupCommand } from '../RemoveContactFromGroupCommand'
import { InMemoryGroupRepository } from './testDoubles'

describe('CreateGroupCommand', () => {
  it('creates a group', async () => {
    const groupRepository = new InMemoryGroupRepository()
    const command = new CreateGroupCommand(groupRepository)

    const result = await command.execute({ workspaceId: 'ws-1', name: 'VIPs' })

    expect(result.isOk()).toBe(true)
    expect(groupRepository.groups.size).toBe(1)
  })

  it('rejects an empty name', async () => {
    const groupRepository = new InMemoryGroupRepository()
    const command = new CreateGroupCommand(groupRepository)

    const result = await command.execute({ workspaceId: 'ws-1', name: '  ' })

    expect(result.isFail()).toBe(true)
  })
})

describe('AddContactToGroupCommand / RemoveContactFromGroupCommand', () => {
  it('increments and decrements contactCount', async () => {
    const groupRepository = new InMemoryGroupRepository()
    const createGroup = new CreateGroupCommand(groupRepository)
    const groupId = (await createGroup.execute({ workspaceId: 'ws-1', name: 'VIPs' })).getValue()
      .groupId

    const add = new AddContactToGroupCommand(groupRepository)
    const addResult = await add.execute({ contactId: 'c-1', groupId, workspaceId: 'ws-1' })
    expect(addResult.isOk()).toBe(true)
    expect(groupRepository.groups.get(groupId)!.contactCount).toBe(1)

    const remove = new RemoveContactFromGroupCommand(groupRepository)
    const removeResult = await remove.execute({ contactId: 'c-1', groupId, workspaceId: 'ws-1' })
    expect(removeResult.isOk()).toBe(true)
    expect(groupRepository.groups.get(groupId)!.contactCount).toBe(0)
  })

  it('fails when group does not exist', async () => {
    const groupRepository = new InMemoryGroupRepository()
    const add = new AddContactToGroupCommand(groupRepository)

    const result = await add.execute({ contactId: 'c-1', groupId: 'missing', workspaceId: 'ws-1' })

    expect(result.isFail()).toBe(true)
  })
})
