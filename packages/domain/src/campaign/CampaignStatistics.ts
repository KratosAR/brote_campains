import { ValueObject } from '../shared/ValueObject'

export interface CampaignStatisticsProps {
  total: number
  pending: number
  queued: number
  sending: number
  sent: number
  delivered: number
  read: number
  failed: number
  cancelled: number
}

export class CampaignStatistics extends ValueObject<CampaignStatisticsProps> {
  private constructor(props: CampaignStatisticsProps) {
    super(props)
  }

  static zero(): CampaignStatistics {
    return new CampaignStatistics({
      total: 0,
      pending: 0,
      queued: 0,
      sending: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      cancelled: 0,
    })
  }

  withDelta(delta: Partial<CampaignStatisticsProps>): CampaignStatistics {
    const next = { ...this.props }
    for (const key of Object.keys(delta) as (keyof CampaignStatisticsProps)[]) {
      next[key] = this.props[key] + (delta[key] ?? 0)
    }
    return new CampaignStatistics(next)
  }

  get total(): number {
    return this.props.total
  }

  get pending(): number {
    return this.props.pending
  }

  get queued(): number {
    return this.props.queued
  }

  get sending(): number {
    return this.props.sending
  }

  get sent(): number {
    return this.props.sent
  }

  get delivered(): number {
    return this.props.delivered
  }

  get read(): number {
    return this.props.read
  }

  get failed(): number {
    return this.props.failed
  }

  get cancelled(): number {
    return this.props.cancelled
  }
}
