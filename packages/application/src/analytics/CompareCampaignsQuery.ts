import { CampaignId, DeliveryStatus } from '@bcp/domain'
import type { ICampaignRepository, IDeliveryRepository } from '@bcp/contracts'
import type { ComparableCampaign } from './AnalyticsTypes'

export class CompareCampaignsQuery {
  constructor(
    private campaignRepository: ICampaignRepository,
    private deliveryRepository: IDeliveryRepository
  ) {}

  async execute(workspaceId: string, campaignIds: string[]): Promise<ComparableCampaign[]> {
    const results: ComparableCampaign[] = []

    for (const campaignId of campaignIds) {
      const id = CampaignId.from(campaignId)
      const campaignResult = await this.campaignRepository.findById(id, workspaceId)

      if (campaignResult.isFail()) {
        continue
      }

      const campaign = campaignResult.getValue()
      const page = await this.deliveryRepository.findByCampaign(campaignId, workspaceId, undefined, { page: 1, limit: 100000 })
      const deliveries = page.items

      const byStatus = this.groupByStatus(deliveries)
      const sent = (byStatus[DeliveryStatus.Sent] ?? 0) + (byStatus[DeliveryStatus.Delivered] ?? 0) + (byStatus[DeliveryStatus.Read] ?? 0)
      const delivered = byStatus[DeliveryStatus.Delivered] ?? 0
      const read = byStatus[DeliveryStatus.Read] ?? 0

      results.push({
        campaignId: campaign.campaignId.toString(),
        campaignName: campaign.name,
        totalContacts: deliveries.length,
        sent,
        delivered,
        read,
        failed: byStatus[DeliveryStatus.Failed] ?? 0,
        deliveryRate: sent > 0 ? Math.round((delivered + read) / sent * 100) / 100 : 0,
        readRate: delivered > 0 ? Math.round(read / delivered * 100) / 100 : 0,
      })
    }

    return results
  }

  private groupByStatus(deliveries: any[]): Record<string, number> {
    const result: Record<string, number> = {}
    for (const delivery of deliveries) {
      result[delivery.status] = (result[delivery.status] ?? 0) + 1
    }
    return result
  }
}
