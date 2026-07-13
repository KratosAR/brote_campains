import type { CommandModule } from 'yargs'
import { execSync } from 'child_process'

const dbMigrate: CommandModule = {
  command: 'db:migrate',
  describe: 'Run database migrations',
  handler: async () => {
    try {
      console.log('Running Prisma migrations...')
      execSync('pnpm db:migrate', {
        cwd: process.cwd(),
        stdio: 'inherit',
      })
      console.log('✓ Migrations completed')
    } catch (error) {
      console.error('Failed to run migrations:', error)
      process.exit(1)
    }
  },
}

export default dbMigrate
