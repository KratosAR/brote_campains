import { AggregateRoot } from '../shared/AggregateRoot'
import { Result } from '../shared/Result'
import { DomainError, BusinessRuleViolationError, ValidationError } from '../shared/errors/DomainError'
import { ChannelType } from '../contact/ChannelType'
import { DeliveryId } from './DeliveryId'
import { DeliveryStatus } from './DeliveryStatus'
import { DeliveryAttempt } from './DeliveryAttempt'
import { CampaignTimelineEntry } from '../campaign/CampaignTimelineEntry'
import { DeliveryQueued, DeliveryFailed, DeliveryCompleted, DeliveryExpired } from './events/DeliveryEvents'

interface DeliveryProps {
  campaignId: string
  workspaceId: string
  contactId: string
  channel: ChannelType
  address: string
  messageSnapshot: string
  status: DeliveryStatus
  attempts: DeliveryAttempt[]
  providerMessageId?: string
  timeline: CampaignTimelineEntry[]
}

const TERMINAL_STATUSES = [
  DeliveryStatus.Sent,
  DeliveryStatus.Delivered,
  DeliveryStatus.Read,
  DeliveryStatus.Cancelled,
  DeliveryStatus.Expired,
]

export class Delivery extends AggregateRoot<DeliveryProps> {
  private constructor(props: DeliveryProps, id?: DeliveryId, createdAt?: Date) {
    super(props, id, createdAt)
  }

  static create(
    campaignId: string,
    workspaceId: string,
    contactId: string,
    channel: ChannelType,
    address: string,
    messageSnapshot: string,
  ): Result<Delivery, ValidationError> {
    if (!address.trim()) {
      return Result.fail(new ValidationError('Delivery address cannot be empty', 'address'))
    }
    if (!messageSnapshot.trim()) {
      return Result.fail(new ValidationError('Delivery messageSnapshot cannot be empty', 'messageSnapshot'))
    }

    const delivery = new Delivery({
      campaignId,
      workspaceId,
      contactId,
      channel,
      address,
      messageSnapshot,
      status: DeliveryStatus.Pending,
      attempts: [],
      timeline: [],
    })

    delivery.addTimelineEntry(CampaignTimelineEntry.create('DeliveryCreated'))
    return Result.ok(delivery)
  }

  static hydrate(props: DeliveryProps, id: DeliveryId, createdAt: Date, updatedAt: Date): Delivery {
    const delivery = new Delivery(props, id, createdAt)
    delivery.updatedAt = updatedAt
    return delivery
  }

  get deliveryId(): DeliveryId {
    return this._id as DeliveryId
  }

  get campaignId(): string {
    return this.props.campaignId
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get contactId(): string {
    return this.props.contactId
  }

  get channel(): ChannelType {
    return this.props.channel
  }

  get address(): string {
    return this.props.address
  }

  get messageSnapshot(): string {
    return this.props.messageSnapshot
  }

  get status(): DeliveryStatus {
    return this.props.status
  }

  get attempts(): DeliveryAttempt[] {
    return [...this.props.attempts]
  }

  get providerMessageId(): string | undefined {
    return this.props.providerMessageId
  }

  get timeline(): CampaignTimelineEntry[] {
    return [...this.props.timeline]
  }

  addTimelineEntry(entry: CampaignTimelineEntry): void {
    this.props = { ...this.props, timeline: [...this.props.timeline, entry] }
  }

  markQueued(): Result<void, DomainError> {
    if (this.props.status !== DeliveryStatus.Pending) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot queue a delivery in status "${this.props.status}"`,
          'delivery.markQueued.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: DeliveryStatus.Queued }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliveryQueued'))
    this.addDomainEvent(
      new DeliveryQueued(this.id.toString(), this.deliveryId.toString(), this.props.campaignId, this.props.workspaceId),
    )
    return Result.ok(undefined)
  }

  markSending(attemptNumber: number): Result<void, DomainError> {
    // ponytail: además de Queued, se permite desde Failed — es el reintento (retry-delivery job)
    // volviendo a intentar el envío tras canRetry() haber dado true.
    const sendable = [DeliveryStatus.Queued, DeliveryStatus.Failed]
    if (!sendable.includes(this.props.status)) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot mark sending a delivery in status "${this.props.status}"`,
          'delivery.markSending.invalidStatus',
        ),
      )
    }

    this.props = {
      ...this.props,
      status: DeliveryStatus.Sending,
      attempts: [...this.props.attempts, DeliveryAttempt.start(attemptNumber)],
    }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliverySending', { attemptNumber }))
    return Result.ok(undefined)
  }

  markSent(providerMessageId: string): Result<void, DomainError> {
    if (this.props.status !== DeliveryStatus.Sending) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot mark sent a delivery in status "${this.props.status}"`,
          'delivery.markSent.invalidStatus',
        ),
      )
    }

    this.props = {
      ...this.props,
      status: DeliveryStatus.Sent,
      providerMessageId,
      attempts: this.withLastAttemptResolved((last) => last.withSuccess(providerMessageId)),
    }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliverySent'))
    this.addDomainEvent(
      new DeliveryCompleted(
        this.id.toString(),
        this.deliveryId.toString(),
        this.props.campaignId,
        this.props.workspaceId,
        DeliveryStatus.Sent,
      ),
    )
    return Result.ok(undefined)
  }

  markDelivered(): Result<void, DomainError> {
    if (this.props.status !== DeliveryStatus.Sent) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot mark delivered a delivery in status "${this.props.status}"`,
          'delivery.markDelivered.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: DeliveryStatus.Delivered }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliveryDelivered'))
    this.addDomainEvent(
      new DeliveryCompleted(
        this.id.toString(),
        this.deliveryId.toString(),
        this.props.campaignId,
        this.props.workspaceId,
        DeliveryStatus.Delivered,
      ),
    )
    return Result.ok(undefined)
  }

  markRead(): Result<void, DomainError> {
    if (this.props.status !== DeliveryStatus.Delivered) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot mark read a delivery in status "${this.props.status}"`,
          'delivery.markRead.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: DeliveryStatus.Read }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliveryRead'))
    this.addDomainEvent(
      new DeliveryCompleted(
        this.id.toString(),
        this.deliveryId.toString(),
        this.props.campaignId,
        this.props.workspaceId,
        DeliveryStatus.Read,
      ),
    )
    return Result.ok(undefined)
  }

  markFailed(error: { errorCode?: string; errorMessage?: string }): Result<void, DomainError> {
    if (this.props.status !== DeliveryStatus.Sending) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot mark failed a delivery in status "${this.props.status}"`,
          'delivery.markFailed.invalidStatus',
        ),
      )
    }

    const attempts = this.withLastAttemptResolved((last) => last.withFailure(error))
    // ponytail: non-null safe — reachable only from Sending, which always has >=1 attempt from markSending
    const lastAttempt = attempts[attempts.length - 1]!

    this.props = { ...this.props, status: DeliveryStatus.Failed, attempts }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliveryFailed', { ...error }))
    this.addDomainEvent(
      new DeliveryFailed(
        this.id.toString(),
        this.deliveryId.toString(),
        this.props.campaignId,
        this.props.workspaceId,
        lastAttempt.attemptNumber,
        error.errorCode,
      ),
    )
    return Result.ok(undefined)
  }

  canRetry(maxRetries: number): boolean {
    return this.props.status === DeliveryStatus.Failed && this.props.attempts.length < maxRetries
  }

  markExpired(): Result<void, DomainError> {
    if (TERMINAL_STATUSES.includes(this.props.status)) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot expire a delivery in status "${this.props.status}"`,
          'delivery.markExpired.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: DeliveryStatus.Expired }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliveryExpired'))
    this.addDomainEvent(
      new DeliveryExpired(this.id.toString(), this.deliveryId.toString(), this.props.campaignId, this.props.workspaceId),
    )
    return Result.ok(undefined)
  }

  cancel(): Result<void, DomainError> {
    const cancellable = [DeliveryStatus.Pending, DeliveryStatus.Queued]
    if (!cancellable.includes(this.props.status)) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot cancel a delivery in status "${this.props.status}"`,
          'delivery.cancel.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: DeliveryStatus.Cancelled }
    this.addTimelineEntry(CampaignTimelineEntry.create('DeliveryCancelled'))
    return Result.ok(undefined)
  }

  private withLastAttemptResolved(resolve: (last: DeliveryAttempt) => DeliveryAttempt): DeliveryAttempt[] {
    const attempts = this.props.attempts
    const last = attempts[attempts.length - 1]
    if (!last) return attempts
    return [...attempts.slice(0, -1), resolve(last)]
  }
}
