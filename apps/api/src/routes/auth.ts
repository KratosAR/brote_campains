import { Router } from 'express'
import { z } from 'zod'

import { RegisterWorkspaceCommand, LoginCommand, RefreshTokenCommand, RevokeSessionCommand } from '@bcp/application'
import { DomainError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { authRateLimiter } from '../middleware/rateLimit'
import { sendDomainError } from '../utils/httpError'
import { asyncHandler } from '../utils/asyncHandler'
import { Cradle } from '../container'
import { AwilixContainer } from 'awilix'

const registerSchema = z.object({
  ownerName: z.string().min(1),
  ownerEmail: z.string().email(),
  ownerPassword: z.string().min(8),
  workspaceName: z.string().min(1),
  timezone: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

export function createAuthRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  router.use('/auth', authRateLimiter)

  router.post('/auth/register', asyncHandler(async (req, res) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
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
      res.status(400).json({ success: false, error: 'Invalid email or password' })
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
      res.status(400).json({ success: false, error: 'refreshToken is required' })
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
      res.status(400).json({ success: false, error: 'refreshToken is required' })
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
