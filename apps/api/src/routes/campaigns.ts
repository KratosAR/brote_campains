import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import {
  CreateCampaignCommand,
  ScheduleCampaignCommand,
  PauseCampaignCommand,
  ResumeCampaignCommand,
  CancelCampaignCommand,
  ArchiveCampaignCommand,
  DuplicateCampaignCommand,
  GetCampaignQuery,
  ListCampaignsQuery,
  GetCampaignTimelineQuery,
} from '@bcp/application'
import { Campaign, ChannelType, CampaignStatus, DomainError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { requireOwnWorkspace } from '../middleware/requireOwnWorkspace'
import { sendDomainError } from '../utils/httpError'
import { asyncHandler } from '../utils/asyncHandler'
import { Cradle } from '../container'

const createCampaignSchema = z.object({
  name: z.string().min(1),
  channel: z.nativeEnum(ChannelType),
  audienceType: z.enum(['all', 'group', 'segment', 'manual']),
  audienceGroupIds: z.array(z.string()).optional(),
  audienceContactIds: z.array(z.string()).optional(),
  templateId: z.string().min(1),
  scheduledAt: z.coerce.date().optional(),
  timezone: z.string().optional(),
  sendNow: z.boolean().optional(),
  deliveryPolicy: z.object({ maxRetries: z.number(), retryDelays: z.array(z.number()) }).optional(),
})

const scheduleCampaignSchema = z.object({
  scheduledAt: z.coerce.date(),
  timezone: z.string().min(1),
})

const reasonSchema = z.object({
  reason: z.string().optional(),
})

function campaignToJson(campaign: Campaign) {
  return {
    id: campaign.campaignId.toString(),
    workspaceId: campaign.workspaceId,
    name: campaign.name,
    channel: campaign.channel,
    status: campaign.status,
    templateId: campaign.templateId,
    audience: {
      type: campaign.audience.type,
      groupIds: campaign.audience.groupIds,
      contactIds: campaign.audience.contactIds,
    },
    schedule: campaign.scheduleInfo
      ? { sendAt: campaign.scheduleInfo.sendAt, timezone: campaign.scheduleInfo.timezone }
      : undefined,
  }
}

export function createCampaignsRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  router.use('/workspaces/:id/campaigns', authenticate(jwtSecret), requireOwnWorkspace)

  router.post('/workspaces/:id/campaigns', asyncHandler(async (req, res) => {
    const parsed = createCampaignSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new CreateCampaignCommand(
      container.resolve('campaignRepository'),
      container.resolve('eventBus'),
    )
    const result = await command.execute({
      workspaceId: String(req.params.id),
      name: parsed.data.name,
      channel: parsed.data.channel,
      audienceType: parsed.data.audienceType,
      audienceGroupIds: parsed.data.audienceGroupIds,
      audienceContactIds: parsed.data.audienceContactIds,
      templateId: parsed.data.templateId,
      scheduledAt: parsed.data.scheduledAt,
      timezone: parsed.data.timezone,
      sendNow: parsed.data.sendNow,
      deliveryPolicy: parsed.data.deliveryPolicy,
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  }))

  router.get('/workspaces/:id/campaigns', asyncHandler(async (req, res) => {
    const query = new ListCampaignsQuery(container.resolve('campaignRepository'))
    const page = await query.execute({
      workspaceId: String(req.params.id),
      status: req.query.status ? (String(req.query.status) as CampaignStatus) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    })
    res.status(200).json({
      success: true,
      data: page.items.map(campaignToJson),
      meta: { total: page.total, page: page.page, limit: page.limit },
    })
  }))

  router.get('/workspaces/:id/campaigns/:campaignId', asyncHandler(async (req, res) => {
    const query = new GetCampaignQuery(container.resolve('campaignRepository'))
    const result = await query.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true, data: campaignToJson(result.getValue()) })
  }))

  router.get('/workspaces/:id/campaigns/:campaignId/timeline', asyncHandler(async (req, res) => {
    const query = new GetCampaignTimelineQuery(container.resolve('campaignRepository'))
    const result = await query.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({
      success: true,
      data: result.getValue().map((entry) => ({ event: entry.event, occurredAt: entry.occurredAt, metadata: entry.metadata })),
    })
  }))

  router.patch('/workspaces/:id/campaigns/:campaignId/schedule', asyncHandler(async (req, res) => {
    const parsed = scheduleCampaignSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new ScheduleCampaignCommand(container.resolve('campaignRepository'))
    const result = await command.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
      scheduledAt: parsed.data.scheduledAt,
      timezone: parsed.data.timezone,
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true })
  }))

  router.post('/workspaces/:id/campaigns/:campaignId/pause', asyncHandler(async (req, res) => {
    const parsed = reasonSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new PauseCampaignCommand(container.resolve('campaignRepository'))
    const result = await command.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
      reason: parsed.data.reason,
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true })
  }))

  router.post('/workspaces/:id/campaigns/:campaignId/resume', asyncHandler(async (req, res) => {
    const command = new ResumeCampaignCommand(container.resolve('campaignRepository'))
    const result = await command.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true })
  }))

  router.post('/workspaces/:id/campaigns/:campaignId/cancel', asyncHandler(async (req, res) => {
    const parsed = reasonSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new CancelCampaignCommand(container.resolve('campaignRepository'))
    const result = await command.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
      reason: parsed.data.reason,
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true })
  }))

  router.post('/workspaces/:id/campaigns/:campaignId/archive', asyncHandler(async (req, res) => {
    const command = new ArchiveCampaignCommand(container.resolve('campaignRepository'))
    const result = await command.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true })
  }))

  router.post('/workspaces/:id/campaigns/:campaignId/duplicate', asyncHandler(async (req, res) => {
    const command = new DuplicateCampaignCommand(container.resolve('campaignRepository'))
    const result = await command.execute({
      campaignId: String(req.params.campaignId),
      workspaceId: String(req.params.id),
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  }))

  return router
}
