import express, { Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import path from 'path'
import { AwilixContainer } from 'awilix'

import { correlationIdMiddleware } from './middleware/correlationId'
import { requestLoggerMiddleware } from './middleware/requestLogger'
import { globalRateLimiter, authRateLimiter } from './middleware/rateLimiter'
import { healthRouter } from './routes/health'
import { metricsRouter } from './routes/metrics'
import { createAuthRouter } from './routes/auth'
import { createWorkspacesRouter } from './routes/workspaces'
import { createInvitationsRouter } from './routes/invitations'
import { createContactsRouter } from './routes/contacts'
import { createTemplatesRouter } from './routes/templates'
import { createCampaignsRouter } from './routes/campaigns'
import { createChannelsRouter } from './routes/channels'
import { createAnalyticsRouter } from './routes/analytics'
import { Cradle } from './container'

export function createApp(container: AwilixContainer<Cradle>, jwtSecret: string): Express {
  const app = express()

  app.use(helmet())
  app.use(cors())
  app.use(compression())
  app.use(express.json())
  app.use(correlationIdMiddleware)
  app.use(requestLoggerMiddleware)
  app.use(globalRateLimiter)

  app.use(healthRouter)
  app.use(metricsRouter)
  app.use(authRateLimiter)
  app.use(createAuthRouter(container, jwtSecret))
  app.use(createWorkspacesRouter(container, jwtSecret))
  app.use(createInvitationsRouter(container, jwtSecret))
  app.use(createContactsRouter(container, jwtSecret))
  app.use(createTemplatesRouter(container, jwtSecret))
  app.use(createCampaignsRouter(container, jwtSecret))
  app.use(createChannelsRouter(container, jwtSecret))
  app.use(createAnalyticsRouter(container))

  if (process.env.NODE_ENV !== 'production') {
    setupSwagger(app)
  }

  return app
}

function setupSwagger(app: Express) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const swaggerUi = require('swagger-ui-express')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const YAML = require('yamljs')
    const swaggerDoc = YAML.load(path.join(__dirname, '../../../docs/openapi/openapi.yaml'))
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc))
  } catch {
    // OpenAPI file not found yet — skip silently
  }
}
