import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import { AcceptInvitationCommand } from '@bcp/application'
import { DomainError } from '@bcp/domain'

import { authRateLimiter } from '../middleware/rateLimit'
import { sendDomainError } from '../utils/httpError'
import { Cradle } from '../container'

const acceptSchema = z.object({
  name: z.string().min(1),
  password: z.string().min(8),
})

export function createInvitationsRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  router.post('/invitations/:token/accept', authRateLimiter, async (req, res) => {
    const parsed = acceptSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new AcceptInvitationCommand(
      container.resolve('userRepository'),
      container.resolve('workspaceUserRepository'),
      container.resolve('invitationRepository'),
      container.resolve('refreshTokenRepository'),
      container.resolve('eventBus'),
      jwtSecret,
    )
    const result = await command.execute({
      token: String(req.params.token),
      name: parsed.data.name,
      password: parsed.data.password,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true, data: result.getValue() })
  })

  return router
}
