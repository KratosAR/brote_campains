import express, { Express } from 'express'
import rateLimit from 'express-rate-limit'

import { IQueue } from '@bcp/contracts'

import { Env } from './config/env'
import { createMetaWebhookRouter } from './routes/meta'
import { createEvolutionWebhookRouter } from './routes/evolution'

// ponytail: límite generoso (los proveedores mandan ráfagas legítimas de eventos), pensado
// para frenar flood/abuso del endpoint público, no tráfico normal de Meta/Evolution.
const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
})

export function createApp(queue: IQueue, env: Env): Express {
  const app = express()

  app.use(webhookRateLimiter)

  app.use(
    express.json({
      verify: (req, _res, buf) => {
        ;(req as express.Request).rawBody = buf
      },
    }),
  )

  app.use(createMetaWebhookRouter(queue, env))
  app.use(createEvolutionWebhookRouter(queue, env))

  return app
}
