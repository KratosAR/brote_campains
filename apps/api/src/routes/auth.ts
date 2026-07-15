import { Router } from 'express'
import { z } from 'zod'

import { RegisterWorkspaceCommand, LoginCommand, RefreshTokenCommand, RevokeSessionCommand, validatePasswordComplexity } from '@bcp/application'
import { DomainError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { authRateLimiter } from '../middleware/rateLimit'
import { sendDomainError } from '../utils/httpError'
import { asyncHandler } from '../utils/asyncHandler'
import { formatValidationErrors, toErrorResponse } from '../utils/validation'
import { Cradle } from '../container'
import { AwilixContainer } from 'awilix'

const registerSchema = z.object({
  ownerName: z.string({ required_error: 'ownerName is required' })
    .min(1, 'ownerName cannot be empty'),
  ownerEmail: z.string({ required_error: 'ownerEmail is required' })
    .email('ownerEmail must be a valid email address'),
  ownerPassword: z.string({ required_error: 'ownerPassword is required' })
    .refine(
      pwd => validatePasswordComplexity(pwd).isValid,
      pwd => {
        const validation = validatePasswordComplexity(pwd)
        return { message: validation.errors[0] || 'Invalid password' }
      },
    ),
  workspaceName: z.string({ required_error: 'workspaceName is required' })
    .min(1, 'workspaceName cannot be empty'),
  timezone: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string({ required_error: 'email is required' })
    .email('email must be a valid email address'),
  password: z.string({ required_error: 'password is required' })
    .min(1, 'password cannot be empty'),
})

const refreshSchema = z.object({
  refreshToken: z.string({ required_error: 'refreshToken is required' })
    .min(1, 'refreshToken cannot be empty'),
})

export function createAuthRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  router.use('/auth', authRateLimiter)

  router.post('/auth/register', asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = formatValidationErrors(parsed.error)
      res.status(400).json(toErrorResponse(errors))
      return
    }

    const command = new RegisterWorkspaceCommand(
      container.resolve('userRepository'),
      container.resolve('workspaceRepository'),
      container.resolve('workspaceUserRepository'),
      container.resolve('refreshTokenRepository'),
      container.resolve('eventBus'),
      jwtSecret,
    )
    const result = await command.execute(parsed.data)
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  }))

  router.post('/auth/login', asyncHandler(async (req, res) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = formatValidationErrors(parsed.error)
      res.status(400).json(toErrorResponse(errors))
      return
    }

    const command = new LoginCommand(
      container.resolve('userRepository'),
      container.resolve('workspaceUserRepository'),
      container.resolve('refreshTokenRepository'),
      jwtSecret,
    )
    const result = await command.execute(parsed.data)
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true, data: result.getValue() })
  }))

  router.post('/auth/refresh', asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = formatValidationErrors(parsed.error)
      res.status(400).json(toErrorResponse(errors))
      return
    }

    const command = new RefreshTokenCommand(
      container.resolve('refreshTokenRepository'),
      container.resolve('workspaceUserRepository'),
      jwtSecret,
    )
    const result = await command.execute(parsed.data)
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true, data: result.getValue() })
  }))

  router.post('/auth/logout', authenticate(jwtSecret), asyncHandler(async (req, res) => {
    const parsed = refreshSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = formatValidationErrors(parsed.error)
      res.status(400).json(toErrorResponse(errors))
      return
    }

    const command = new RevokeSessionCommand(container.resolve('refreshTokenRepository'))
    const result = await command.execute({ userId: req.user!.sub, refreshToken: parsed.data.refreshToken })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(204).send()
  }))

  return router
}
