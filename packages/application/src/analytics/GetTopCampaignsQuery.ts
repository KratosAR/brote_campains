import { DeliveryStatus } from '@bcp/domain'
import type { ICampaignRepository, IDeliveryRepository } from '@bcp/contracts'
import type { TopCampaign } from './AnalyticsTypes'

type Metric = 'deliveryRate' | 'readRate'

export class GetTopCampaignsQuery {
  constructor(
    private campaignRepository: ICampaignRepository,
    private deliveryRepository: IDeliveryRepository
  ) {}

  async execute(workspaceId: string, metric: Metric, limit: number = 10): Promise<TopCampaign[]> {
    // ponytail: for MVP, fetch all and rank in memory. For scale, use DB sorting with limit.
    const page = await this.campaignRepository.findByStatus(
      workspaceId,
      [], // all statuses
      { page: 1, limit: 10000 }
    )
    const campaigns = page.items

    const scored: TopCampaign[] = []

    for (const campaign of campaigns) {
      const deliveryPage = await this.deliveryRepository.findByCampaign(campaign.campaignId.toString(), workspaceId, undefined, { page: 1, limit: 100000 })
      const deliveries = deliveryPage.items

      if (deliveries.length === 0) continue

      const byStatus = this.groupByStatus(deliveries)
      const sent = (byStatus[DeliveryStatus.Sent] ?? 0) + (byStatus[DeliveryStatus.Delivered] ?? 0) + (byStatus[DeliveryStatus.Read] ?? 0)
      const delivered = byStatus[DeliveryStatus.Delivered] ?? 0
      const read = byStatus[DeliveryStatus.Read] ?? 0

      let score = 0
      if (metric === 'deliveryRate') {
        score = sent > 0 ? (delivered + read) / sent : 0
      } else if (metric === 'readRate') {
        score = delivered > 0 ? read / delivered : 0
      }

      scored.push({
        campaignId: campaign.campaignId.toString(),
        campaignName: campaign.name,
        value: Math.round(score * 100) / 100,
      })
    }

    return scored.sort((a, b) => b.value - a.value).slice(0, limit)
  }

  private groupByStatus(deliveries: any[]): Record<string, number> {
    const result: Record<string, number> = {}
    for (const delivery of deliveries) {
      result[delivery.status] = (result[delivery.status] ?? 0) + 1
    }
    return result
  }
}
