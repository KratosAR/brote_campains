import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import { ConnectProviderCommand, DisconnectProviderCommand, GetChannelStatusQuery, HealthCheckCommand } from '@bcp/application'
import { ChannelConnection, ChannelType, DomainError, ValidationError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { requireOwnWorkspace } from '../middleware/requireOwnWorkspace'
import { sendDomainError } from '../utils/httpError'
import { Cradle } from '../container'

const connectSchema = z.object({
  channel: z.nativeEnum(ChannelType),
  providerId: z.string().min(1),
  credentials: z.unknown(),
  priority: z.number().int().positive().optional(),
})

function channelConnectionToJson(connection: ChannelConnection) {
  return {
    id: connection.connectionId.toString(),
    workspaceId: connection.workspaceId,
    channel: connection.channel,
    providerId: connection.providerId,
    status: connection.status,
    priority: connection.priority,
    enabled: connection.enabled,
    capabilities: connection.capabilities,
    lastHealthCheck: connection.lastHealthCheck,
  }
}

export function createChannelsRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  router.use('/workspaces/:id/channels', authenticate(jwtSecret), requireOwnWorkspace)

  router.post('/workspaces/:id/channels/connect', async (req, res) => {
    const parsed = connectSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new ConnectProviderCommand(container.resolve('channelConnectionRepository'), container.resolve('providerRegistry'))
    const result = await command.execute({
      workspaceId: String(req.params.id),
      channel: parsed.data.channel,
      providerId: parsed.data.providerId,
      credentials: parsed.data.credentials,
      priority: parsed.data.priority,
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: channelConnectionToJson(result.getValue()) })
  })

  router.get('/workspaces/:id/channels', async (req, res) => {
    const connections = await container.resolve('channelConnectionRepository').findByWorkspace(String(req.params.id))
    res.status(200).json({ success: true, data: connections.map(channelConnectionToJson) })
  })

  router.get('/workspaces/:id/channels/:channel/status', async (req, res) => {
    const channelParsed = z.nativeEnum(ChannelType).safeParse(req.params.channel)
    if (!channelParsed.success) {
      sendDomainError(res, new ValidationError(`Unknown channel "${req.params.channel}"`, 'channel'))
      return
    }

    const query = new GetChannelStatusQuery(container.resolve('channelConnectionRepository'))
    const connections = await query.execute({ workspaceId: String(req.params.id), channel: channelParsed.data })
    res.status(200).json({ success: true, data: connections.map(channelConnectionToJson) })
  })

  router.post('/workspaces/:id/channels/:connectionId/disconnect', async (req, res) => {
    const command = new DisconnectProviderCommand(container.resolve('channelConnectionRepository'))
    const result = await command.execute({
      connectionId: String(req.params.connectionId),
      workspaceId: String(req.params.id),
      userId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true })
  })

  router.post('/workspaces/:id/channels/:connectionId/health-check', async (req, res) => {
    const command = new HealthCheckCommand(container.resolve('channelConnectionRepository'), container.resolve('providerRegistry'))
    const result = await command.execute({
      connectionId: String(req.params.connectionId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true, data: result.getValue() })
  })

  return router
}
