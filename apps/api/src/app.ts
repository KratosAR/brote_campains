import express, { Express } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import path from 'path'

import { correlationIdMiddleware } from './middleware/correlationId'
import { requestLoggerMiddleware } from './middleware/requestLogger'
import { healthRouter } from './routes/health'
import { metricsRouter } from './routes/metrics'

export function createApp(): Express {
  const app = express()

  app.use(helmet())
  app.use(cors())
  app.use(compression())
  app.use(express.json())
  app.use(correlationIdMiddleware)
  app.use(requestLoggerMiddleware)

  app.use(healthRouter)
  app.use(metricsRouter)

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
