import { AggregateRoot } from '../shared/AggregateRoot'
import { Result } from '../shared/Result'
import { DomainError, BusinessRuleViolationError } from '../shared/errors/DomainError'
import { ChannelType } from '../contact/ChannelType'
import { CampaignId } from './CampaignId'
import { CampaignStatus } from './CampaignStatus'
import { CampaignAudience } from './CampaignAudience'
import { CampaignSchedule } from './CampaignSchedule'
import { DeliveryPolicy } from './DeliveryPolicy'
import { CampaignStatistics, CampaignStatisticsProps } from './CampaignStatistics'
import { CampaignTimelineEntry } from './CampaignTimelineEntry'
import { CampaignHasAudience } from './specifications/CampaignSpecifications'
import {
  CampaignCreated,
  CampaignScheduled,
  CampaignStarted,
  CampaignPaused,
  CampaignResumed,
  CampaignCancelled,
  CampaignCompleted,
  CampaignArchived,
} from './events/CampaignEvents'

interface CampaignProps {
  workspaceId: string
  name: string
  channel: ChannelType
  audience: CampaignAudience
  templateId: string
  status: CampaignStatus
  schedule?: CampaignSchedule
  deliveryPolicy: DeliveryPolicy
  statistics: CampaignStatistics
  timeline: CampaignTimelineEntry[]
}

export class Campaign extends AggregateRoot<CampaignProps> {
  private constructor(props: CampaignProps, id?: CampaignId, createdAt?: Date) {
    super(props, id, createdAt)
  }

  static createDraft(
    workspaceId: string,
    name: string,
    channel: ChannelType,
    audience: CampaignAudience,
    templateId: string,
    schedule?: CampaignSchedule,
    deliveryPolicy?: DeliveryPolicy,
  ): Result<Campaign, DomainError> {
    const campaign = new Campaign({
      workspaceId,
      name,
      channel,
      audience,
      templateId,
      status: CampaignStatus.Draft,
      schedule,
      deliveryPolicy: deliveryPolicy ?? DeliveryPolicy.default(),
      statistics: CampaignStatistics.zero(),
      timeline: [],
    })

    campaign.addTimelineEntry(CampaignTimelineEntry.create('CampaignCreated'))
    campaign.addDomainEvent(
      new CampaignCreated(campaign.id.toString(), campaign.campaignId.toString(), workspaceId, name, channel),
    )

    return Result.ok(campaign)
  }

  static hydrate(props: CampaignProps, id: CampaignId, createdAt: Date, updatedAt: Date): Campaign {
    const campaign = new Campaign(props, id, createdAt)
    campaign.updatedAt = updatedAt
    return campaign
  }

  get campaignId(): CampaignId {
    return this._id as CampaignId
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get name(): string {
    return this.props.name
  }

  get channel(): ChannelType {
    return this.props.channel
  }

  get audience(): CampaignAudience {
    return this.props.audience
  }

  get templateId(): string {
    return this.props.templateId
  }

  get status(): CampaignStatus {
    return this.props.status
  }

  // ponytail: getter renombrado a `scheduleInfo` porque `schedule` ya es el nombre del método de
  // transición de estado (campaign.schedule(schedule)) — un mismo nombre de miembro no puede ser
  // getter y método a la vez.
  get scheduleInfo(): CampaignSchedule | undefined {
    return this.props.schedule
  }

  get deliveryPolicy(): DeliveryPolicy {
    return this.props.deliveryPolicy
  }

  get statistics(): CampaignStatistics {
    return this.props.statistics
  }

  get timeline(): CampaignTimelineEntry[] {
    return [...this.props.timeline]
  }

  schedule(schedule: CampaignSchedule): Result<void, DomainError> {
    if (this.props.status !== CampaignStatus.Draft) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot schedule a campaign in status "${this.props.status}"`,
          'campaign.schedule.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: CampaignStatus.Scheduled, schedule }
    this.addTimelineEntry(CampaignTimelineEntry.create('CampaignScheduled'))
    this.addDomainEvent(
      new CampaignScheduled(this.id.toString(), this.campaignId.toString(), this.props.workspaceId, schedule.sendAt),
    )
    return Result.ok(undefined)
  }

  start(): Result<void, DomainError> {
    if (this.props.status !== CampaignStatus.Scheduled) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot start a campaign in status "${this.props.status}"`,
          'campaign.start.invalidStatus',
        ),
      )
    }

    const canStart = this.canStart()
    if (canStart.isFail()) {
      return Result.fail(canStart.getError())
    }

    this.props = { ...this.props, status: CampaignStatus.Running }
    const startedAt = new Date()
    this.addTimelineEntry(CampaignTimelineEntry.create('CampaignStarted'))
    this.addDomainEvent(
      new CampaignStarted(this.id.toString(), this.campaignId.toString(), this.props.workspaceId, startedAt),
    )
    return Result.ok(undefined)
  }

  pause(reason?: string): Result<void, DomainError> {
    if (this.props.status !== CampaignStatus.Running) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot pause a campaign in status "${this.props.status}"`,
          'campaign.pause.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: CampaignStatus.Paused }
    this.addTimelineEntry(CampaignTimelineEntry.create('CampaignPaused', reason ? { reason } : undefined))
    this.addDomainEvent(
      new CampaignPaused(this.id.toString(), this.campaignId.toString(), this.props.workspaceId, reason),
    )
    return Result.ok(undefined)
  }

  resume(): Result<void, DomainError> {
    if (this.props.status !== CampaignStatus.Paused) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot resume a campaign in status "${this.props.status}"`,
          'campaign.resume.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: CampaignStatus.Running }
    this.addTimelineEntry(CampaignTimelineEntry.create('CampaignResumed'))
    this.addDomainEvent(new CampaignResumed(this.id.toString(), this.campaignId.toString(), this.props.workspaceId))
    return Result.ok(undefined)
  }

  cancel(reason?: string): Result<void, DomainError> {
    const cancellable = [CampaignStatus.Draft, CampaignStatus.Scheduled, CampaignStatus.Running, CampaignStatus.Paused]
    if (!cancellable.includes(this.props.status)) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot cancel a campaign in status "${this.props.status}"`,
          'campaign.cancel.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: CampaignStatus.Cancelled }
    this.addTimelineEntry(CampaignTimelineEntry.create('CampaignCancelled', reason ? { reason } : undefined))
    this.addDomainEvent(
      new CampaignCancelled(this.id.toString(), this.campaignId.toString(), this.props.workspaceId, reason),
    )
    return Result.ok(undefined)
  }

  complete(): Result<void, DomainError> {
    if (this.props.status !== CampaignStatus.Running) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot complete a campaign in status "${this.props.status}"`,
          'campaign.complete.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: CampaignStatus.Completed }
    this.addTimelineEntry(CampaignTimelineEntry.create('CampaignCompleted'))
    this.addDomainEvent(
      new CampaignCompleted(
        this.id.toString(),
        this.campaignId.toString(),
        this.props.workspaceId,
        this.statisticsProps(),
      ),
    )
    return Result.ok(undefined)
  }

  archive(): Result<void, DomainError> {
    const archivable = [CampaignStatus.Completed, CampaignStatus.Cancelled]
    if (!archivable.includes(this.props.status)) {
      return Result.fail(
        new BusinessRuleViolationError(
          `Cannot archive a campaign in status "${this.props.status}"`,
          'campaign.archive.invalidStatus',
        ),
      )
    }

    this.props = { ...this.props, status: CampaignStatus.Archived }
    this.addTimelineEntry(CampaignTimelineEntry.create('CampaignArchived'))
    this.addDomainEvent(new CampaignArchived(this.id.toString(), this.campaignId.toString(), this.props.workspaceId))
    return Result.ok(undefined)
  }

  updateStatistics(delta: Partial<CampaignStatisticsProps>): void {
    this.props = { ...this.props, statistics: this.props.statistics.withDelta(delta) }
  }

  addTimelineEntry(entry: CampaignTimelineEntry): void {
    this.props = { ...this.props, timeline: [...this.props.timeline, entry] }
  }

  // ponytail: BR-001 (provider conectado) se verifica en Sprint 7 cuando exista ChannelConnection;
  // acá solo se valida lo que el dominio actual puede saber.
  canStart(): Result<void, BusinessRuleViolationError> {
    if (!new CampaignHasAudience().isSatisfiedBy(this)) {
      return Result.fail(new BusinessRuleViolationError('Campaign has no recipients', 'campaign.canStart.noAudience'))
    }

    return Result.ok(undefined)
  }

  private statisticsProps(): CampaignStatisticsProps {
    const s = this.props.statistics
    return {
      total: s.total,
      pending: s.pending,
      queued: s.queued,
      sending: s.sending,
      sent: s.sent,
      delivered: s.delivered,
      read: s.read,
      failed: s.failed,
      cancelled: s.cancelled,
    }
  }
}
