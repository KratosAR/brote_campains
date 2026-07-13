import type { Prisma, Delivery as PrismaDelivery } from '@prisma/client'
import { Delivery, DeliveryId, DeliveryStatus, DeliveryAttempt, CampaignTimelineEntry } from '@bcp/domain'
import type { ChannelType } from '@bcp/domain'

interface PersistedAttempt {
  attemptNumber: number
  startedAt: string
  completedAt?: string
  providerMessageId?: string
  errorCode?: string
  errorMessage?: string
  success: boolean
}

interface PersistedTimelineEntry {
  event: string
  occurredAt: string
  metadata?: Record<string, unknown>
}

export const DeliveryMapper = {
  toDomain(record: PrismaDelivery): Delivery {
    const attempts = (record.attempts as unknown as PersistedAttempt[]).map((a) =>
      DeliveryAttempt.create({
        attemptNumber: a.attemptNumber,
        startedAt: new Date(a.startedAt),
        completedAt: a.completedAt ? new Date(a.completedAt) : undefined,
        providerMessageId: a.providerMessageId,
        errorCode: a.errorCode,
        errorMessage: a.errorMessage,
        success: a.success,
      }),
    )

    const timeline = (record.timeline as unknown as PersistedTimelineEntry[]).map((entry) =>
      CampaignTimelineEntry.create(entry.event, entry.metadata, new Date(entry.occurredAt)),
    )

    return Delivery.hydrate(
      {
        campaignId: record.campaignId,
        workspaceId: record.workspaceId,
        contactId: record.contactId,
        channel: record.channel as ChannelType,
        address: record.address,
        messageSnapshot: record.messageSnapshot,
        status: record.status as DeliveryStatus,
        attempts,
        providerMessageId: record.providerMessageId ?? undefined,
        timeline,
      },
      DeliveryId.from(record.id),
      record.createdAt,
      record.updatedAt,
    )
  },

  toPersistence(
    delivery: Delivery,
  ): Omit<PrismaDelivery, 'createdAt' | 'updatedAt' | 'attempts' | 'timeline'> & {
    createdAt: Date
    updatedAt: Date
    attempts: Prisma.InputJsonValue
    timeline: Prisma.InputJsonValue
  } {
    return {
      id: delivery.deliveryId.toString(),
      campaignId: delivery.campaignId,
      workspaceId: delivery.workspaceId,
      contactId: delivery.contactId,
      channel: delivery.channel,
      address: delivery.address,
      messageSnapshot: delivery.messageSnapshot,
      status: delivery.status,
      providerMessageId: delivery.providerMessageId ?? null,
      attempts: delivery.attempts.map((a) => ({
        attemptNumber: a.attemptNumber,
        startedAt: a.startedAt.toISOString(),
        completedAt: a.completedAt?.toISOString(),
        providerMessageId: a.providerMessageId,
        errorCode: a.errorCode,
        errorMessage: a.errorMessage,
        success: a.success,
      })) as Prisma.InputJsonValue,
      timeline: delivery.timeline.map((entry) => ({
        event: entry.event,
        occurredAt: entry.occurredAt.toISOString(),
        metadata: entry.metadata,
      })) as Prisma.InputJsonValue,
      createdAt: delivery.createdAt,
      updatedAt: delivery.updatedAt,
    }
  },
}
