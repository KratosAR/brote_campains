import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import {
  CreateTemplateCommand,
  UpdateTemplateCommand,
  ArchiveTemplateCommand,
  PreviewTemplateQuery,
  GetTemplateQuery,
  ListTemplatesQuery,
} from '@bcp/application'
import { Template, ChannelType, DomainError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { requireOwnWorkspace } from '../middleware/requireOwnWorkspace'
import { validateRequest } from '../middleware/validateRequest'
import { sendDomainError } from '../utils/httpError'
import { asyncHandler } from '../utils/asyncHandler'
import { Cradle } from '../container'

const createTemplateSchema = z.object({
  name: z.string({ required_error: 'name is required' })
    .min(1, 'name cannot be empty'),
  channel: z.nativeEnum(ChannelType, { errorMap: () => ({ message: 'channel must be one of: WhatsApp, Email, SMS, Telegram' }) }),
  body: z.string({ required_error: 'body is required' })
    .min(1, 'body cannot be empty'),
  createdBy: z.string().optional(),
  description: z.string().optional(),
})

const createVersionSchema = z.object({
  body: z.string({ required_error: 'body is required' })
    .min(1, 'body cannot be empty'),
  createdBy: z.string().optional(),
})

const previewTemplateSchema = z.object({
  version: z.number().int().positive('version must be a positive integer').optional(),
  sampleValues: z.record(z.string()).default({}),
})

function templateToJson(template: Template) {
  return {
    id: template.templateId.toString(),
    workspaceId: template.workspaceId,
    name: template.name,
    description: template.description,
    channel: template.channel,
    status: template.status,
    activeVersion: template.activeVersion,
    versions: template.versions.map((v) => ({
      version: v.version,
      body: v.content.body,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
    })),
  }
}

export function createTemplatesRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  router.use('/workspaces/:id', authenticate(jwtSecret), requireOwnWorkspace)

  router.post('/workspaces/:id/templates', validateRequest(createTemplateSchema), asyncHandler(async (req, res) => {
    const data = req.validated
    const command = new CreateTemplateCommand(container.resolve('templateRepository'))
    const result = await command.execute({
      workspaceId: String(req.params.id),
      name: data.name,
      channel: data.channel,
      body: data.body,
      createdBy: data.createdBy,
      description: data.description,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  }))

  router.get('/workspaces/:id/templates', asyncHandler(async (req, res) => {
    const query = new ListTemplatesQuery(container.resolve('templateRepository'))
    const page = await query.execute({
      workspaceId: String(req.params.id),
      channel: req.query.channel ? String(req.query.channel) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    })
    res.status(200).json({
      success: true,
      data: page.items.map(templateToJson),
      meta: { total: page.total, page: page.page, limit: page.limit },
    })
  }))

  router.get('/workspaces/:id/templates/:templateId', asyncHandler(async (req, res) => {
    const query = new GetTemplateQuery(container.resolve('templateRepository'))
    const result = await query.execute({
      templateId: String(req.params.templateId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true, data: templateToJson(result.getValue()) })
  }))

  router.post('/workspaces/:id/templates/:templateId/versions', validateRequest(createVersionSchema), asyncHandler(async (req, res) => {
    const data = req.validated
    const command = new UpdateTemplateCommand(container.resolve('templateRepository'))
    const result = await command.execute({
      templateId: String(req.params.templateId),
      workspaceId: String(req.params.id),
      body: data.body,
      createdBy: data.createdBy,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true })
  }))

  router.post('/workspaces/:id/templates/:templateId/preview', validateRequest(previewTemplateSchema), asyncHandler(async (req, res) => {
    const data = req.validated
    const query = new PreviewTemplateQuery(container.resolve('templateRepository'))
    const result = await query.execute({
      templateId: String(req.params.templateId),
      workspaceId: String(req.params.id),
      version: data.version,
      sampleValues: data.sampleValues,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true, data: { rendered: result.getValue() } })
  }))

  router.delete('/workspaces/:id/templates/:templateId', asyncHandler(async (req, res) => {
    const command = new ArchiveTemplateCommand(container.resolve('templateRepository'))
    const result = await command.execute({
      templateId: String(req.params.templateId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true })
  }))

  return router
}
