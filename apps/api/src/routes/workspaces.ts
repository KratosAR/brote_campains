import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import { InviteUserCommand } from '@bcp/application'
import { WorkspaceId, UserRole, DomainError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { requireOwnWorkspace } from '../middleware/requireOwnWorkspace'
import { validateRequest } from '../middleware/validateRequest'
import { sendDomainError } from '../utils/httpError'
import { asyncHandler } from '../utils/asyncHandler'
import { Cradle } from '../container'

const inviteSchema = z.object({
  email: z.string({ required_error: 'email is required' })
    .email('email must be a valid email address'),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'role must be one of: Owner, Admin, Member' }) }),
})

const updateWorkspaceSchema = z.object({
  name: z.string().min(1, 'name cannot be empty').optional(),
  slug: z.string().min(1, 'slug cannot be empty').optional(),
  settings: z.object({
    timezone: z.string().optional(),
    locale: z.string().optional(),
    maxContacts: z.number().int().positive().optional(),
    maxCampaigns: z.number().int().positive().optional(),
  }).optional(),
})

export function createWorkspacesRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  // Every route below is scoped to :id — enforce the token-vs-path workspace
  // match once, here, so new routes added under this path inherit the guard
  // instead of each handler having to remember it (root-cause fix for the
  // IDOR patch that used to live inline in GET /workspaces/:id).
  router.use('/workspaces/:id', authenticate(jwtSecret), requireOwnWorkspace)

  router.get('/workspaces/:id', asyncHandler(async (req, res) => {
    const workspaceId = WorkspaceId.from(String(req.params.id))
    const result = await container.resolve('workspaceRepository').findById(workspaceId)
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }

    const workspace = result.getValue()
    res.status(200).json({
      success: true,
      data: {
        id: workspace.workspaceId.toString(),
        name: workspace.name,
        slug: workspace.slug,
        status: workspace.status,
        settings: {
          timezone: workspace.settings.timezone,
          locale: workspace.settings.locale,
          maxContacts: workspace.settings.maxContacts,
          maxCampaigns: workspace.settings.maxCampaigns,
        },
      },
    })
  }))

  router.put('/workspaces/:id', validateRequest(updateWorkspaceSchema), asyncHandler(async (req, res) => {
    const data = req.validated
    const workspaceId = WorkspaceId.from(String(req.params.id))
    const result = await container.resolve('workspaceRepository').findById(workspaceId)
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }

    const workspace = result.getValue()
    res.status(200).json({
      success: true,
      data: {
        id: workspace.workspaceId.toString(),
        name: data.name || workspace.name,
        slug: data.slug || workspace.slug,
        status: workspace.status,
        settings: {
          timezone: data.settings?.timezone || workspace.settings.timezone,
          locale: data.settings?.locale || workspace.settings.locale,
          maxContacts: data.settings?.maxContacts || workspace.settings.maxContacts,
          maxCampaigns: data.settings?.maxCampaigns || workspace.settings.maxCampaigns,
        },
      },
    })
  }))

  router.post('/workspaces/:id/users/invite', validateRequest(inviteSchema), asyncHandler(async (req, res) => {
    const data = req.validated
    const command = new InviteUserCommand(
      container.resolve('userRepository'),
      container.resolve('workspaceUserRepository'),
      container.resolve('invitationRepository'),
      container.resolve('eventBus'),
    )
    const result = await command.execute({
      workspaceId: String(req.params.id),
      email: data.email,
      role: data.role,
      invitedByUserId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  }))

  return router
}
