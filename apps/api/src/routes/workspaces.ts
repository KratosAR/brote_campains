import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import { InviteUserCommand } from '@bcp/application'
import { WorkspaceId, UserRole, DomainError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { requireOwnWorkspace } from '../middleware/requireOwnWorkspace'
import { sendDomainError } from '../utils/httpError'
import { Cradle } from '../container'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
})

export function createWorkspacesRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  // Every route below is scoped to :id — enforce the token-vs-path workspace
  // match once, here, so new routes added under this path inherit the guard
  // instead of each handler having to remember it (root-cause fix for the
  // IDOR patch that used to live inline in GET /workspaces/:id).
  router.use('/workspaces/:id', authenticate(jwtSecret), requireOwnWorkspace)

  router.get('/workspaces/:id', async (req, res) => {
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
  })

  router.post('/workspaces/:id/users/invite', async (req, res) => {
    const parsed = inviteSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new InviteUserCommand(
      container.resolve('userRepository'),
      container.resolve('workspaceUserRepository'),
      container.resolve('invitationRepository'),
      container.resolve('eventBus'),
    )
    const result = await command.execute({
      workspaceId: String(req.params.id),
      email: parsed.data.email,
      role: parsed.data.role,
      invitedByUserId: req.user!.sub,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  })

  return router
}
