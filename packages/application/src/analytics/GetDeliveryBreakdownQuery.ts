import type { IDeliveryRepository } from '@bcp/contracts'
import type { DeliveryBreakdown, DeliveryBreakdownBucket } from './AnalyticsTypes'

type GroupBy = 'status' | 'hour' | 'provider'

export class GetDeliveryBreakdownQuery {
  constructor(private deliveryRepository: IDeliveryRepository) {}

  async execute(campaignId: string, workspaceId: string, groupBy: GroupBy): Promise<DeliveryBreakdown> {
    const page = await this.deliveryRepository.findByCampaign(campaignId, workspaceId, undefined, { page: 1, limit: 100000 })
    const deliveries = page.items

    const breakdown: DeliveryBreakdown = {
      campaignId,
      total: deliveries.length,
    }

    if (groupBy === 'status') {
      breakdown.byStatus = this.breakdownByStatus(deliveries)
    } else if (groupBy === 'hour') {
      breakdown.byHour = this.breakdownByHour(deliveries)
    } else if (groupBy === 'provider') {
      breakdown.byProvider = this.breakdownByProvider(deliveries)
    }

    return breakdown
  }

  private breakdownByStatus(deliveries: any[]): DeliveryBreakdownBucket[] {
    const map = new Map<string, number>()
    for (const delivery of deliveries) {
      map.set(delivery.status, (map.get(delivery.status) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([key, count]) => ({ key, count }))
  }

  private breakdownByHour(deliveries: any[]): DeliveryBreakdownBucket[] {
    const map = new Map<number, number>()
    for (const delivery of deliveries) {
      const hour = new Date(delivery.createdAt).getHours()
      map.set(hour, (map.get(hour) ?? 0) + 1)
    }
    const buckets: DeliveryBreakdownBucket[] = []
    for (let h = 0; h < 24; h++) {
      const count = map.get(h)
      if (count) {
        buckets.push({ key: `${h}:00`, count })
      }
    }
    return buckets
  }

  private breakdownByProvider(deliveries: any[]): DeliveryBreakdownBucket[] {
    const map = new Map<string, number>()
    for (const delivery of deliveries) {
      const provider = (delivery as any).providerMessageId?.split(':')[0] ?? 'unknown'
      map.set(provider, (map.get(provider) ?? 0) + 1)
    }
    return Array.from(map.entries()).map(([key, count]) => ({ key, count }))
  }
}
