import type { Prisma, Campaign as PrismaCampaign } from '@prisma/client'
import {
  Campaign,
  CampaignId,
  CampaignStatus,
  CampaignAudience,
  CampaignAudienceType,
  CampaignSchedule,
  DeliveryPolicy,
  CampaignStatistics,
  CampaignStatisticsProps,
  CampaignTimelineEntry,
} from '@bcp/domain'
import type { ChannelType } from '@bcp/domain'

// ponytail: slug se deriva solo en persistencia (el dominio Campaign no tiene campo slug),
// mismo criterio simple que Workspace.slugify.
function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

interface PersistedTimelineEntry {
  event: string
  occurredAt: string
  metadata?: Record<string, unknown>
}

export const CampaignMapper = {
  toDomain(record: PrismaCampaign): Campaign {
    const audience = CampaignAudience.create({
      type: record.audienceType as CampaignAudienceType,
      groupIds: (record.audienceGroupIds as string[] | null) ?? undefined,
      contactIds: (record.audienceContactIds as string[] | null) ?? undefined,
    }).getValue()

    const schedule = record.scheduledAt
      ? CampaignSchedule.create({
          sendAt: record.scheduledAt,
          timezone: record.timezone ?? '',
          sendNow: record.sendNow,
        }).getValue()
      : undefined

    const deliveryPolicy = DeliveryPolicy.create({
      maxRetries: record.maxRetries,
      retryDelays: record.retryDelays as number[],
    })

    const statistics = CampaignStatistics.zero().withDelta(
      record.statistics as unknown as CampaignStatisticsProps,
    )

    const timeline = (record.timeline as unknown as PersistedTimelineEntry[]).map((entry) =>
      CampaignTimelineEntry.create(entry.event, entry.metadata, new Date(entry.occurredAt)),
    )

    return Campaign.hydrate(
      {
        workspaceId: record.workspaceId,
        name: record.name,
        channel: record.channel as ChannelType,
        audience,
        templateId: record.templateId,
        status: record.status as CampaignStatus,
        schedule,
        deliveryPolicy,
        statistics,
        timeline,
      },
      CampaignId.from(record.id),
      record.createdAt,
      record.updatedAt,
    )
  },

  toPersistence(
    campaign: Campaign,
  ): Omit<
    PrismaCampaign,
    'createdAt' | 'updatedAt' | 'audienceGroupIds' | 'audienceContactIds' | 'retryDelays' | 'statistics' | 'timeline'
  > & {
    createdAt: Date
    updatedAt: Date
    audienceGroupIds: Prisma.InputJsonValue
    audienceContactIds: Prisma.InputJsonValue
    retryDelays: Prisma.InputJsonValue
    statistics: Prisma.InputJsonValue
    timeline: Prisma.InputJsonValue
  } {
    const schedule = campaign.scheduleInfo

    return {
      id: campaign.campaignId.toString(),
      workspaceId: campaign.workspaceId,
      name: campaign.name,
      slug: slugify(campaign.name),
      status: campaign.status,
      channel: campaign.channel,
      templateId: campaign.templateId,
      audienceType: campaign.audience.type,
      audienceGroupIds: (campaign.audience.groupIds ?? []) as Prisma.InputJsonValue,
      audienceContactIds: (campaign.audience.contactIds ?? []) as Prisma.InputJsonValue,
      scheduledAt: schedule?.sendAt ?? null,
      timezone: schedule?.timezone ?? null,
      sendNow: schedule?.sendNow ?? false,
      maxRetries: campaign.deliveryPolicy.maxRetries,
      retryDelays: campaign.deliveryPolicy.retryDelays as Prisma.InputJsonValue,
      statistics: {
        total: campaign.statistics.total,
        pending: campaign.statistics.pending,
        queued: campaign.statistics.queued,
        sending: campaign.statistics.sending,
        sent: campaign.statistics.sent,
        delivered: campaign.statistics.delivered,
        read: campaign.statistics.read,
        failed: campaign.statistics.failed,
        cancelled: campaign.statistics.cancelled,
      } as Prisma.InputJsonValue,
      timeline: campaign.timeline.map((entry) => ({
        event: entry.event,
        occurredAt: entry.occurredAt.toISOString(),
        metadata: entry.metadata,
      })) as Prisma.InputJsonValue,
      startedAt: null,
      completedAt: null,
      cancelledAt: null,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      createdBy: null,
    }
  },
}
