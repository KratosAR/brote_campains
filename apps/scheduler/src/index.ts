import { validateEnv } from './config/env'
import { createContainer } from './container'
import { pollScheduledCampaigns } from './pollScheduledCampaigns'

const POLL_INTERVAL_MS = 30_000

const env = validateEnv()
const { prisma, queue, logger } = createContainer(env)

const intervalId = setInterval(() => {
  pollScheduledCampaigns(prisma, queue).catch((error) => {
    logger.error('scheduler poll failed', error)
  })
}, POLL_INTERVAL_MS)

// ponytail: shutdown simple, sin drenar jobs en vuelo — suficiente para un poller stateless.
process.on('SIGTERM', () => {
  clearInterval(intervalId)
  process.exit(0)
})
