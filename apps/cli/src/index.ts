#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import workspaceList from './commands/workspaceList'
import campaignStatus from './commands/campaignStatus'
import deliveryRetry from './commands/deliveryRetry'
import dbMigrate from './commands/dbMigrate'
import dbSeed from './commands/dbSeed'

yargs(hideBin(process.argv))
  .command(workspaceList)
  .command(campaignStatus)
  .command(deliveryRetry)
  .command(dbMigrate)
  .command(dbSeed)
  .demandCommand()
  .strict()
  .help()
  .parse()
