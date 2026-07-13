import { CampaignId, DeliveryStatus } from '@bcp/domain'
import type { ICampaignRepository, IDeliveryRepository } from '@bcp/contracts'
import type { CampaignStats, HourlyBucket } from './AnalyticsTypes'

export class GetCampaignStatsQuery {
  constructor(
    private campaignRepository: ICampaignRepository,
    private deliveryRepository: IDeliveryRepository
  ) {}

  async execute(campaignId: string, workspaceId: string): Promise<CampaignStats> {
    const id = CampaignId.from(campaignId)
    const campaignResult = await this.campaignRepository.findById(id, workspaceId)

    if (campaignResult.isFail()) {
      throw new Error('Campaign not found')
    }

    const campaign = campaignResult.getValue()
    const page = await this.deliveryRepository.findByCampaign(campaignId, workspaceId, undefined, { page: 1, limit: 100000 })
    const deliveries = page.items

    const byStatus = this.groupByStatus(deliveries)
    const errorBreakdown = this.breakdownErrors(deliveries)
    const hourlyDistribution = this.buildHourlyDistribution(deliveries)

    const sent = (byStatus[DeliveryStatus.Sent] ?? 0) + (byStatus[DeliveryStatus.Delivered] ?? 0) + (byStatus[DeliveryStatus.Read] ?? 0)
    const delivered = byStatus[DeliveryStatus.Delivered] ?? 0
    const read = byStatus[DeliveryStatus.Read] ?? 0

    return {
      campaignId: campaign.campaignId.toString(),
      campaignName: campaign.name,
      channel: campaign.channel,
      status: campaign.status,
      totalContacts: deliveries.length,
      pending: byStatus[DeliveryStatus.Pending] ?? 0,
      queued: byStatus[DeliveryStatus.Queued] ?? 0,
      sending: byStatus[DeliveryStatus.Sending] ?? 0,
      sent,
      delivered,
      read,
      failed: byStatus[DeliveryStatus.Failed] ?? 0,
      cancelled: byStatus[DeliveryStatus.Cancelled] ?? 0,
      deliveryRate: sent > 0 ? Math.round((delivered + read) / sent * 100) / 100 : 0,
      readRate: delivered > 0 ? Math.round(read / delivered * 100) / 100 : 0,
      errorBreakdown,
      hourlyDistribution,
    }
  }

  private groupByStatus(deliveries: any[]): Record<string, number> {
    const result: Record<string, number> = {}
    for (const delivery of deliveries) {
      result[delivery.status] = (result[delivery.status] ?? 0) + 1
    }
    return result
  }

  private breakdownErrors(deliveries: any[]): Record<string, number> {
    const errors: Record<string, number> = {}
    for (const delivery of deliveries) {
      if (delivery.status === DeliveryStatus.Failed && delivery.attempts && delivery.attempts.length > 0) {
        const lastAttempt = delivery.attempts[delivery.attempts.length - 1] as any
        const errorCode = lastAttempt?.errorCode ?? 'unknown'
        errors[errorCode] = (errors[errorCode] ?? 0) + 1
      }
    }
    return errors
  }

  private buildHourlyDistribution(deliveries: any[]): HourlyBucket[] {
    const hourMap = new Map<number, { sent: number; delivered: number; failed: number }>()

    for (const delivery of deliveries) {
      const hour = new Date(delivery.createdAt).getHours()
      const bucket = hourMap.get(hour) ?? { sent: 0, delivered: 0, failed: 0 }

      if (delivery.status === DeliveryStatus.Sent || delivery.status === DeliveryStatus.Delivered || delivery.status === DeliveryStatus.Read) {
        bucket.sent += 1
      }
      if (delivery.status === DeliveryStatus.Delivered || delivery.status === DeliveryStatus.Read) {
        bucket.delivered += 1
      }
      if (delivery.status === DeliveryStatus.Failed) {
        bucket.failed += 1
      }

      hourMap.set(hour, bucket)
    }

    const buckets: HourlyBucket[] = []
    for (let h = 0; h < 24; h++) {
      const bucket = hourMap.get(h)
      if (bucket) {
        buckets.push({ hour: h, ...bucket })
      }
    }

    return buckets
  }
}
