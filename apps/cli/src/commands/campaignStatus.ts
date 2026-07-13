import type { CommandModule } from 'yargs'
import { PrismaClient } from '@prisma/client'

interface CampaignStatusArgs {
  id: string
}

const campaignStatus: CommandModule<unknown, CampaignStatusArgs> = {
  command: 'campaign:status <id>',
  describe: 'Get campaign status and statistics',
  builder: {
    id: {
      type: 'string',
      describe: 'Campaign ID',
    },
  },
  handler: async (argv) => {
    const prisma = new PrismaClient()

    try {
      const campaign = await prisma.campaign.findUnique({
        where: { id: argv.id },
      })

      if (!campaign) {
        console.error(`Campaign ${argv.id} not found`)
        process.exit(1)
      }

      const deliveries = await prisma.delivery.groupBy({
        by: ['status'],
        where: { campaignId: argv.id },
        _count: { status: true },
      })

      const statsByStatus = Object.fromEntries(
        deliveries.map((d) => [d.status, d._count.status]),
      )

      console.log('\n=== Campaign Details ===')
      console.log(`ID:          ${campaign.id}`)
      console.log(`Name:        ${campaign.name}`)
      console.log(`Status:      ${campaign.status}`)
      console.log(`Channel:     ${campaign.channel}`)
      console.log(`Created:     ${campaign.createdAt.toISOString()}`)
      if (campaign.scheduledAt) {
        console.log(`Scheduled:   ${campaign.scheduledAt.toISOString()}`)
      }
      if (campaign.startedAt) {
        console.log(`Started:     ${campaign.startedAt.toISOString()}`)
      }
      if (campaign.completedAt) {
        console.log(`Completed:   ${campaign.completedAt.toISOString()}`)
      }

      console.log('\n=== Delivery Statistics ===')
      console.table(statsByStatus)

      const total = Object.values(statsByStatus).reduce((a, b) => a + b, 0)
      console.log(`\nTotal deliveries: ${total}`)
    } catch (error) {
      console.error('Failed to get campaign status:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  },
}

export default campaignStatus
