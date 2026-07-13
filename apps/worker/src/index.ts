import { Job, Worker } from 'bullmq'

import { validateEnv } from './config/env'
import { createContainer } from './container'
import { startCampaignHandler, StartCampaignJobData } from './handlers/startCampaign'
import { sendDeliveryHandler, SendDeliveryJobData } from './handlers/sendDelivery'
import { retryDeliveryHandler } from './handlers/retryDelivery'
import { updateStatisticsHandler, UpdateStatisticsJobData } from './handlers/updateStatistics'
import { processWebhookHandler, ProcessWebhookJobData } from './handlers/processWebhook'

const env = validateEnv()
const container = createContainer(env)
const {
  redis,
  queue,
  logger,
  campaignRepository,
  contactRepository,
  groupRepository,
  templateRepository,
  deliveryRepository,
  eventBus,
  provider,
} = container

async function dispatch(job: Job): Promise<void> {
  switch (job.name) {
    case 'start-campaign':
      return startCampaignHandler(job.data as StartCampaignJobData, {
        campaignRepository,
        contactRepository,
        groupRepository,
        templateRepository,
        deliveryRepository,
        eventBus,
        queue,
      })
    case 'send-delivery':
      return sendDeliveryHandler(job.data as SendDeliveryJobData, {
        deliveryRepository,
        campaignRepository,
        provider,
        queue,
      })
    case 'retry-delivery':
      return retryDeliveryHandler(job.data as SendDeliveryJobData, {
        deliveryRepository,
        campaignRepository,
        provider,
        queue,
      })
    case 'update-statistics':
      return updateStatisticsHandler(job.data as UpdateStatisticsJobData, { campaignRepository })
    case 'process-webhook':
      return processWebhookHandler(job.data as ProcessWebhookJobData, { deliveryRepository, queue, logger })
    default:
      // ponytail: jobName desconocido, sin dead-letter todavía — loggear y descartar alcanza para dev.
      logger.error(`unknown job name "${job.name}"`, new Error('unhandled job'))
  }
}

const worker = new Worker('default', dispatch, { connection: redis })

worker.on('failed', (job, error) => {
  logger.error(`job ${job?.name ?? 'unknown'} failed`, error)
})

// ponytail: shutdown simple, sin drenar jobs en vuelo — igual criterio que apps/scheduler.
process.on('SIGTERM', () => {
  worker.close().finally(() => process.exit(0))
})
