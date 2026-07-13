import { AggregateRoot } from '../shared/AggregateRoot'
import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'
import { GroupId } from './GroupId'

interface ContactGroupProps {
  workspaceId: string
  name: string
  description?: string
  contactCount: number
}

export class ContactGroup extends AggregateRoot<ContactGroupProps> {
  private constructor(props: ContactGroupProps, id?: GroupId, createdAt?: Date) {
    super(props, id, createdAt)
  }

  static create(
    workspaceId: string,
    name: string,
    description?: string,
  ): Result<ContactGroup, ValidationError> {
    if (!name || name.trim().length === 0) {
      return Result.fail(new ValidationError('Group name cannot be empty', 'name'))
    }

    return Result.ok(
      new ContactGroup({
        workspaceId,
        name: name.trim(),
        description,
        contactCount: 0,
      }),
    )
  }

  static hydrate(
    props: ContactGroupProps,
    id: GroupId,
    createdAt: Date,
    updatedAt: Date,
  ): ContactGroup {
    const group = new ContactGroup(props, id, createdAt)
    group.updatedAt = updatedAt
    return group
  }

  get groupId(): GroupId {
    return this._id as GroupId
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get name(): string {
    return this.props.name
  }

  get description(): string | undefined {
    return this.props.description
  }

  get contactCount(): number {
    return this.props.contactCount
  }

  incrementContactCount(): void {
    this.props = { ...this.props, contactCount: this.props.contactCount + 1 }
  }

  decrementContactCount(): void {
    this.props = { ...this.props, contactCount: Math.max(0, this.props.contactCount - 1) }
  }

  rename(name: string): Result<void, ValidationError> {
    if (!name || name.trim().length === 0) {
      return Result.fail(new ValidationError('Group name cannot be empty', 'name'))
    }

    this.props = { ...this.props, name: name.trim() }
    return Result.ok(undefined)
  }
}
