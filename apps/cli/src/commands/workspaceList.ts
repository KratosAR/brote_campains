import type { CommandModule } from 'yargs'
import { PrismaClient } from '@prisma/client'

interface WorkspaceListArgs {
  limit?: number
  offset?: number
}

const workspaceList: CommandModule<unknown, WorkspaceListArgs> = {
  command: 'workspace:list',
  describe: 'List all workspaces',
  builder: {
    limit: {
      type: 'number',
      default: 10,
      describe: 'Number of results to return',
    },
    offset: {
      type: 'number',
      default: 0,
      describe: 'Offset for pagination',
    },
  },
  handler: async (argv) => {
    const prisma = new PrismaClient()

    try {
      const workspaces = await prisma.workspace.findMany({
        take: argv.limit,
        skip: argv.offset,
        orderBy: { createdAt: 'desc' },
      })

      console.table(
        workspaces.map((ws) => ({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          status: ws.status,
          contacts: ws.maxContacts,
          campaigns: ws.maxCampaigns,
          created: ws.createdAt.toISOString(),
        })),
      )

      console.log(`\nTotal: ${workspaces.length} workspaces`)
    } catch (error) {
      console.error('Failed to list workspaces:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  },
}

export default workspaceList
