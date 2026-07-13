import type { CommandModule } from 'yargs'
import { PrismaClient } from '@prisma/client'
import { UniqueId } from '@bcp/domain'

const dbSeed: CommandModule = {
  command: 'db:seed',
  describe: 'Seed database with demo data',
  handler: async () => {
    const prisma = new PrismaClient()

    try {
      console.log('Seeding database with demo data...')

      // Create demo workspace
      const workspaceId = UniqueId.generate().toString()
      const workspace = await prisma.workspace.upsert({
        where: { slug: 'demo' },
        update: {},
        create: {
          id: workspaceId,
          name: 'Demo Workspace',
          slug: 'demo',
          status: 'active',
          timezone: 'UTC',
          locale: 'en-US',
          maxContacts: 10000,
          maxCampaigns: 100,
        },
      })

      console.log(`✓ Created workspace: ${workspace.name}`)

      // Create demo user
      const userId = UniqueId.generate().toString()
      const user = await prisma.user.upsert({
        where: { email: 'demo@example.com' },
        update: {},
        create: {
          id: userId,
          email: 'demo@example.com',
          passwordHash: 'hashed_demo_password',
          name: 'Demo User',
        },
      })

      console.log(`✓ Created user: ${user.email}`)

      // Add user to workspace
      await prisma.workspaceUser.upsert({
        where: { workspaceId_userId: { workspaceId, userId } },
        update: { joinedAt: new Date() },
        create: {
          workspaceId,
          userId,
          role: 'owner',
          joinedAt: new Date(),
        },
      })

      console.log(`✓ Added user to workspace`)

      // Create demo contacts
      const contactIds = []
      for (let i = 0; i < 10; i++) {
        const contactId = UniqueId.generate().toString()
        await prisma.contact.create({
          data: {
            id: contactId,
            workspaceId,
            firstName: `Contact${i + 1}`,
            lastName: 'Demo',
            company: 'Demo Inc',
            status: 'active',
            acceptsCampaigns: 'yes',
          },
        })
        contactIds.push(contactId)
      }

      console.log(`✓ Created 10 demo contacts`)

      // Create demo template
      const templateId = UniqueId.generate().toString()
      const template = await prisma.template.create({
        data: {
          id: templateId,
          workspaceId,
          name: 'Welcome Template',
          channel: 'sms',
          activeVersion: 1,
          status: 'active',
          versions: {
            create: {
              id: UniqueId.generate().toString(),
              workspaceId,
              version: 1,
              body: 'Hello {{firstName}}, welcome to our platform!',
              variables: JSON.stringify(['firstName']),
              createdBy: userId,
            },
          },
        },
      })

      console.log(`✓ Created demo template: ${template.name}`)

      console.log('\n✓ Database seeding completed')
      console.log('\nDemo credentials:')
      console.log('  Email:  demo@example.com')
      console.log('  Workspace: demo')
    } catch (error) {
      console.error('Failed to seed database:', error)
      process.exit(1)
    } finally {
      await prisma.$disconnect()
    }
  },
}

export default dbSeed
