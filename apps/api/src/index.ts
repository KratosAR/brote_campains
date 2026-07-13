import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import { createApp } from './app'
import { validateEnv } from './config/env'
import { createDiContainer } from './container'

const env = validateEnv()
const container = createDiContainer(env)
const logger = container.resolve('logger')

const app = createApp(container, env.JWT_SECRET)

// ponytail: Global error handlers to catch crashes
process.on('uncaughtException', (error) => {
  logger.error(`UNCAUGHT EXCEPTION: ${error.message}`, error)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`UNHANDLED REJECTION: ${reason}`, { promise })
})

app.listen(env.PORT, () => {
  logger.info(`BCP API running on port ${env.PORT} [${env.NODE_ENV}]`)
})
