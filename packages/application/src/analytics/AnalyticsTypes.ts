export interface DashboardStats {
  activeCampaigns: number
  scheduledCampaigns: number
  totalSent: number
  totalDelivered: number
  totalRead: number
  totalFailed: number
  deliveryRate: number
  readRate: number
  recentActivity: ActivityEvent[]
}

export interface ActivityEvent {
  type: 'campaign_created' | 'campaign_started' | 'campaign_paused' | 'delivery_sent' | 'delivery_failed'
  campaignId: string
  campaignName: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export interface CampaignStats {
  campaignId: string
  campaignName: string
  channel: string
  status: string
  totalContacts: number
  pending: number
  queued: number
  sending: number
  sent: number
  delivered: number
  read: number
  failed: number
  cancelled: number
  deliveryRate: number
  readRate: number
  errorBreakdown: Record<string, number>
  hourlyDistribution: HourlyBucket[]
}

export interface HourlyBucket {
  hour: number
  sent: number
  delivered: number
  failed: number
}

export interface ComparableCampaign {
  campaignId: string
  campaignName: string
  totalContacts: number
  sent: number
  delivered: number
  read: number
  failed: number
  deliveryRate: number
  readRate: number
}

export interface TopCampaign {
  campaignId: string
  campaignName: string
  value: number
}

export interface DeliveryBreakdownBucket {
  key: string
  count: number
}

export interface DeliveryBreakdown {
  campaignId: string
  total: number
  byStatus?: DeliveryBreakdownBucket[]
  byHour?: DeliveryBreakdownBucket[]
  byProvider?: DeliveryBreakdownBucket[]
}
