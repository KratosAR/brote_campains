import { ValueObject } from '../shared/ValueObject'

interface CampaignTimelineEntryProps {
  event: string
  occurredAt: Date
  metadata?: Record<string, unknown>
}

export class CampaignTimelineEntry extends ValueObject<CampaignTimelineEntryProps> {
  private constructor(props: CampaignTimelineEntryProps) {
    super(props)
  }

  static create(event: string, metadata?: Record<string, unknown>, occurredAt?: Date): CampaignTimelineEntry {
    return new CampaignTimelineEntry({ event, occurredAt: occurredAt ?? new Date(), metadata })
  }

  get event(): string {
    return this.props.event
  }

  get occurredAt(): Date {
    return this.props.occurredAt
  }

  get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata
  }
}
