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

app.listen(env.PORT, () => {
  logger.info(`BCP API running on port ${env.PORT} [${env.NODE_ENV}]`)
})
