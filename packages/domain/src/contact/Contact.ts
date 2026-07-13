import { AggregateRoot } from '../shared/AggregateRoot'
import { Result } from '../shared/Result'
import { BusinessRuleViolationError, ValidationError } from '../shared/errors/DomainError'
import { ContactId } from './ContactId'
import { ContactStatus } from './ContactStatus'
import { ChannelType } from './ChannelType'
import { ContactChannel } from './ContactChannel'
import { ContactIdentity } from './ContactIdentity'
import { ContactPreferences } from './ContactPreferences'
import {
  ContactCreated,
  ContactUpdated,
  ContactOptedOut,
  ContactOptedIn,
  ContactArchived,
} from './events/ContactEvents'

interface ContactProps {
  workspaceId: string
  identity: ContactIdentity
  channels: ContactChannel[]
  preferences: ContactPreferences
  tags: string[]
  status: ContactStatus
}

export class Contact extends AggregateRoot<ContactProps> {
  private constructor(props: ContactProps, id?: ContactId, createdAt?: Date) {
    super(props, id, createdAt)
  }

  static create(
    workspaceId: string,
    identity: ContactIdentity,
    channels: ContactChannel[],
  ): Result<Contact, ValidationError> {
    if (!channels || channels.length === 0) {
      return Result.fail(new ValidationError('Contact must have at least one channel', 'channels'))
    }

    const contact = new Contact({
      workspaceId,
      identity,
      channels: [...channels],
      preferences: ContactPreferences.create(),
      tags: [],
      status: ContactStatus.Active,
    })

    contact.addDomainEvent(
      new ContactCreated(
        contact.id.toString(),
        contact.id.toString(),
        workspaceId,
        channels.map((c) => ({ type: c.type, value: c.value })),
      ),
    )

    return Result.ok(contact)
  }

  static hydrate(
    props: ContactProps,
    id: ContactId,
    createdAt: Date,
    updatedAt: Date,
  ): Contact {
    const contact = new Contact(props, id, createdAt)
    contact.updatedAt = updatedAt
    return contact
  }

  get contactId(): ContactId {
    return this._id as ContactId
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get identity(): ContactIdentity {
    return this.props.identity
  }

  get channels(): ContactChannel[] {
    return [...this.props.channels]
  }

  get preferences(): ContactPreferences {
    return this.props.preferences
  }

  get tags(): string[] {
    return [...this.props.tags]
  }

  get status(): ContactStatus {
    return this.props.status
  }

  addChannel(channel: ContactChannel): Result<void, BusinessRuleViolationError> {
    if (this.props.channels.some((c) => c.sameChannelAs(channel))) {
      return Result.fail(
        new BusinessRuleViolationError(
          'Contact already has this channel',
          'contact.addChannel.duplicate',
        ),
      )
    }

    this.props = { ...this.props, channels: [...this.props.channels, channel] }
    return Result.ok(undefined)
  }

  removeChannel(type: ChannelType): Result<void, BusinessRuleViolationError> {
    const remaining = this.props.channels.filter((c) => c.type !== type)

    if (remaining.length === this.props.channels.length) {
      return Result.ok(undefined)
    }

    if (remaining.length === 0) {
      return Result.fail(
        new BusinessRuleViolationError(
          'Contact cannot be left without any channel',
          'contact.removeChannel.noneLeft',
        ),
      )
    }

    this.props = { ...this.props, channels: remaining }
    return Result.ok(undefined)
  }

  updateIdentity(identity: ContactIdentity): Result<void, ValidationError> {
    this.props = { ...this.props, identity }
    this.addDomainEvent(
      new ContactUpdated(this.id.toString(), this.id.toString(), this.props.workspaceId, {
        identity,
      }),
    )
    return Result.ok(undefined)
  }

  optOut(): Result<void, BusinessRuleViolationError> {
    // ponytail: new Date() directo, sin Clock inyectado (mismo patrón que Workspace). Inyectar Clock si hace falta testear timestamps exactos.
    const optedOutAt = new Date()
    this.props = { ...this.props, preferences: this.props.preferences.withOptOut(optedOutAt) }
    this.addDomainEvent(
      new ContactOptedOut(this.id.toString(), this.id.toString(), this.props.workspaceId, optedOutAt),
    )
    return Result.ok(undefined)
  }

  optIn(): Result<void, BusinessRuleViolationError> {
    if (!this.props.preferences.optedOutAt) {
      return Result.fail(
        new BusinessRuleViolationError(
          'Contact cannot opt in without having opted out first',
          'contact.optIn.notOptedOut',
        ),
      )
    }

    this.props = { ...this.props, preferences: this.props.preferences.withOptIn() }
    this.addDomainEvent(
      new ContactOptedIn(this.id.toString(), this.id.toString(), this.props.workspaceId),
    )
    return Result.ok(undefined)
  }

  archive(): Result<void, BusinessRuleViolationError> {
    if (this.props.status !== ContactStatus.Active) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot archive a contact from status "${this.props.status}"`,
          'contact.archive.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: ContactStatus.Archived }
    this.addDomainEvent(
      new ContactArchived(this.id.toString(), this.id.toString(), this.props.workspaceId),
    )
    return Result.ok(undefined)
  }

  addTag(tag: string): void {
    if (this.props.tags.includes(tag)) return
    this.props = { ...this.props, tags: [...this.props.tags, tag] }
  }

  removeTag(tag: string): void {
    this.props = { ...this.props, tags: this.props.tags.filter((t) => t !== tag) }
  }

  isOptedOut(): boolean {
    return this.props.preferences.optedOutAt !== undefined
  }
}
