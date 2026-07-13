import { ContactGroup } from '../contact/ContactGroup'
import { ValidationError } from '../shared/errors/DomainError'

describe('ContactGroup', () => {
  it('creates a group with a valid name', () => {
    const result = ContactGroup.create('workspace-1', 'VIP Customers', 'high value contacts')

    expect(result.isOk()).toBe(true)
    const group = result.getValue()
    expect(group.name).toBe('VIP Customers')
    expect(group.workspaceId).toBe('workspace-1')
    expect(group.description).toBe('high value contacts')
    expect(group.contactCount).toBe(0)
  })

  it('rejects an empty name', () => {
    const result = ContactGroup.create('workspace-1', '')

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('increments the contact count', () => {
    const group = ContactGroup.create('workspace-1', 'Group').getValue()

    group.incrementContactCount()
    group.incrementContactCount()

    expect(group.contactCount).toBe(2)
  })

  it('decrements the contact count', () => {
    const group = ContactGroup.create('workspace-1', 'Group').getValue()
    group.incrementContactCount()
    group.incrementContactCount()

    group.decrementContactCount()

    expect(group.contactCount).toBe(1)
  })

  it('never decrements the contact count below zero', () => {
    const group = ContactGroup.create('workspace-1', 'Group').getValue()

    group.decrementContactCount()

    expect(group.contactCount).toBe(0)
  })

  it('renames the group', () => {
    const group = ContactGroup.create('workspace-1', 'Group').getValue()

    const result = group.rename('Renamed Group')

    expect(result.isOk()).toBe(true)
    expect(group.name).toBe('Renamed Group')
  })

  it('rejects renaming to an empty name', () => {
    const group = ContactGroup.create('workspace-1', 'Group').getValue()

    const result = group.rename('')

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
    expect(group.name).toBe('Group')
  })
})
