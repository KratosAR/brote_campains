import { createApp } from './app'
import { validateEnv } from './config/env'

const env = validateEnv()

const app = createApp()

app.listen(env.PORT, () => {
  console.log(`BCP API running on port ${env.PORT} [${env.NODE_ENV}]`)
})
