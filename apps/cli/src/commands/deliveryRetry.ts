import type { CommandModule } from 'yargs'
import { PrismaClient } from '@prisma/client'

interface DeliveryRetryArgs {
  campaignId: string
  status?: string
}

const deliveryRetry: CommandModule<unknown, DeliveryRetryArgs> = {
  command: 'delivery:retry <campaignId>',
  describe: 'Retry failed deliveries for a campaign',
  builder: {
    campaignId: {
      type: 'string',
      describe: 'Campaign ID',
    },
    status: {
      type: 'string',
      default: 'failed',
      describe: 'Delivery status to retry (default: failed)',
    },
  },
  handler: async (argv) => {
    const prisma = new PrismaClient()

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: argv.campaignId },
      })

      if (!campaign) {
        console.error(`Campaign ${argv.campaignId} not found`)
        process.exit(1)
      }

      const deliveries = await prisma.delivery.findMany({
        where: {
          campaignId: argv.campaignId,
          status: argv.status || 'failed',
        },
      })

      if (deliveries.length === 0) {
        console.log(`No deliveries with status '${argv.status || 'failed'}' found`)
        return
      }

      console.log(`Found ${deliveries.length} deliveries to retry`)
      console.log('Updating delivery status to "pending"...')

      const updated = await prisma.delivery.updateMany({
        where: {
          campaignId: argv.campaignId,
          status: argv.status || 'failed',
        },
        data: {
          status: 'pending',
        },
      })

      console.log(`✓ Updated ${updated.count} deliveries`)
      console.log('Deliveries will be re-processed by the worker')
    } catch (error) {
      console.error('Failed to retry deliveries:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  },
}

export default deliveryRetry
