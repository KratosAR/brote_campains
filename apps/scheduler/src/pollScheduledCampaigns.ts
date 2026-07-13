import type { PrismaClient } from '@prisma/client'
import type { IQueue } from '@bcp/contracts'

interface CandidateRow {
  id: string
}

// ponytail: FOR UPDATE SKIP LOCKED en la transacción ya garantiza exclusión mutua
// entre instancias concurrentes del scheduler — no hace falta chequeo de versión extra.
export async function pollScheduledCampaigns(prisma: PrismaClient, queue: IQueue): Promise<number> {
  const startedIds = await prisma.$transaction(async (tx) => {
    const candidates = await tx.$queryRaw<CandidateRow[]>`
      SELECT id FROM campaigns WHERE status = 'Scheduled' AND "scheduledAt" <= NOW() FOR UPDATE SKIP LOCKED LIMIT 50
    `

    for (const { id } of candidates) {
      await tx.campaign.update({ where: { id }, data: { status: 'Running' } })
    }

    return candidates.map((c) => c.id)
  })

  for (const id of startedIds) {
    await queue.add('start-campaign', { campaignId: id })
  }

  return startedIds.length
}
