import { validateEnv } from './config/env'
import { createContainer } from './container'
import { createApp } from './app'

const env = validateEnv()
const container = createContainer(env)
const app = createApp(container.queue, env)

app.listen(env.PORT, () => {
  container.logger.info(`webhook listening on port ${env.PORT}`)
})

// ponytail: shutdown simple, sin drenar requests en vuelo — igual criterio que apps/worker.
process.on('SIGTERM', () => {
  container.redis.disconnect()
  process.exit(0)
})

