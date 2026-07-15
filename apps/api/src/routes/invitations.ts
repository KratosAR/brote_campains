import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import { AcceptInvitationCommand, validatePasswordComplexity } from '@bcp/application'
import { DomainError } from '@bcp/domain'

import { authRateLimiter } from '../middleware/rateLimit'
import { validateRequest } from '../middleware/validateRequest'
import { sendDomainError } from '../utils/httpError'
import { asyncHandler } from '../utils/asyncHandler'
import { Cradle } from '../container'

const acceptSchema = z.object({
  name: z.string({ required_error: 'name is required' })
    .min(1, 'name cannot be empty'),
  password: z.string({ required_error: 'password is required' })
    .refine(
      pwd => validatePasswordComplexity(pwd).isValid,
      pwd => {
        const validation = validatePasswordComplexity(pwd)
        return { message: validation.errors[0] || 'Invalid password' }
      },
    ),
})

export function createInvitationsRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  router.post('/invitations/:token/accept', authRateLimiter, validateRequest(acceptSchema), asyncHandler(async (req, res) => {
    const data = req.validated
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
      name: data.name,
      password: data.password,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true, data: result.getValue() })
  }))

  return router
}
