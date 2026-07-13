import { CampaignStatus, DeliveryStatus } from '@bcp/domain'
import type { ICampaignRepository, IDeliveryRepository } from '@bcp/contracts'
import type { DashboardStats, ActivityEvent } from './AnalyticsTypes'

type PeriodType = '24h' | '7d' | '30d'

export class GetDashboardQuery {
  constructor(
    private campaignRepository: ICampaignRepository,
    private deliveryRepository: IDeliveryRepository
  ) {}

  async execute(workspaceId: string, period: PeriodType): Promise<DashboardStats> {
    const now = new Date()
    const periodMs = this.getPeriodMs(period)
    const startDate = new Date(now.getTime() - periodMs)

    // Fetch campaigns: active and scheduled
    const activePage = await this.campaignRepository.findByStatus(
      workspaceId,
      [CampaignStatus.Running],
      { page: 1, limit: 1000 }
    )
    const scheduledPage = await this.campaignRepository.findByStatus(
      workspaceId,
      [CampaignStatus.Scheduled],
      { page: 1, limit: 1000 }
    )

    const activeCampaigns = activePage.items
    const scheduledCampaigns = scheduledPage.items

    // ponytail: aggregate delivery stats by fetching per campaign (pagination-aware)
    const allDeliveries: any[] = []
    for (const campaign of [...activeCampaigns, ...scheduledCampaigns]) {
      const page = await this.deliveryRepository.findByCampaign(
        campaign.campaignId.toString(),
        workspaceId,
        undefined,
        { page: 1, limit: 10000 }
      )
      allDeliveries.push(...page.items)
    }

    const deliveriesInPeriod = allDeliveries.filter((d) => new Date(d.createdAt) >= startDate)

    const stats = this.calculateStats(deliveriesInPeriod)
    const recentActivity = this.buildActivityEvents(activeCampaigns, scheduledCampaigns)

    return {
      activeCampaigns: activeCampaigns.length,
      scheduledCampaigns: scheduledCampaigns.length,
      ...stats,
      recentActivity: recentActivity.slice(0, 10),
    }
  }

  private getPeriodMs(period: PeriodType): number {
    return {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[period]
  }

  private calculateStats(deliveries: any[]) {
    const byStatus = new Map<string, number>()

    for (const delivery of deliveries) {
      byStatus.set(delivery.status, (byStatus.get(delivery.status) ?? 0) + 1)
    }

    const totalSent = (byStatus.get(DeliveryStatus.Sent) ?? 0) + (byStatus.get(DeliveryStatus.Delivered) ?? 0) + (byStatus.get(DeliveryStatus.Read) ?? 0)
    const totalDelivered = byStatus.get(DeliveryStatus.Delivered) ?? 0
    const totalRead = byStatus.get(DeliveryStatus.Read) ?? 0
    const totalFailed = byStatus.get(DeliveryStatus.Failed) ?? 0

    const deliveryRate = totalSent > 0 ? (totalDelivered + totalRead) / totalSent : 0
    const readRate = totalDelivered > 0 ? totalRead / totalDelivered : 0

    return {
      totalSent,
      totalDelivered,
      totalRead,
      totalFailed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
    }
  }

  private buildActivityEvents(activeCampaigns: any[], scheduledCampaigns: any[]): ActivityEvent[] {
    const events: ActivityEvent[] = []

    for (const campaign of [...activeCampaigns, ...scheduledCampaigns]) {
      const status = campaign.status as string
      if (status === CampaignStatus.Running) {
        events.push({
          type: 'campaign_started',
          campaignId: campaign.campaignId.toString(),
          campaignName: campaign.name,
          timestamp: campaign.startedAt ?? campaign.createdAt,
        })
      } else if (status === CampaignStatus.Scheduled) {
        events.push({
          type: 'campaign_created',
          campaignId: campaign.campaignId.toString(),
          campaignName: campaign.name,
          timestamp: campaign.createdAt,
        })
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }
}
