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
import { sendDomainError } from '../utils/httpError'
import { Cradle } from '../container'

const createTemplateSchema = z.object({
  name: z.string().min(1),
  channel: z.nativeEnum(ChannelType),
  body: z.string().min(1),
  createdBy: z.string().optional(),
  description: z.string().optional(),
})

const createVersionSchema = z.object({
  body: z.string().min(1),
  createdBy: z.string().optional(),
})

const previewTemplateSchema = z.object({
  version: z.number().int().positive().optional(),
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

  router.post('/workspaces/:id/templates', async (req, res) => {
    const parsed = createTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new CreateTemplateCommand(container.resolve('templateRepository'))
    const result = await command.execute({
      workspaceId: String(req.params.id),
      name: parsed.data.name,
      channel: parsed.data.channel,
      body: parsed.data.body,
      createdBy: parsed.data.createdBy,
      description: parsed.data.description,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  })

  router.get('/workspaces/:id/templates', async (req, res) => {
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
  })

  router.get('/workspaces/:id/templates/:templateId', async (req, res) => {
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
  })

  router.post('/workspaces/:id/templates/:templateId/versions', async (req, res) => {
    const parsed = createVersionSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new UpdateTemplateCommand(container.resolve('templateRepository'))
    const result = await command.execute({
      templateId: String(req.params.templateId),
      workspaceId: String(req.params.id),
      body: parsed.data.body,
      createdBy: parsed.data.createdBy,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true })
  })

  router.post('/workspaces/:id/templates/:templateId/preview', async (req, res) => {
    const parsed = previewTemplateSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const query = new PreviewTemplateQuery(container.resolve('templateRepository'))
    const result = await query.execute({
      templateId: String(req.params.templateId),
      workspaceId: String(req.params.id),
      version: parsed.data.version,
      sampleValues: parsed.data.sampleValues,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true, data: { rendered: result.getValue() } })
  })

  router.delete('/workspaces/:id/templates/:templateId', async (req, res) => {
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
  })

  return router
}
