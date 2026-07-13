import crypto from 'crypto'
import { Router } from 'express'

import { IQueue } from '@bcp/contracts'

import { Env } from '../config/env'

// ponytail: Evolution no firma sus webhooks con HMAC — se configura un secreto compartido
// como query param (`?token=...`) al dar de alta la URL del webhook en la instancia de Evolution.
function isValidToken(received: unknown, expected: string): boolean {
  if (typeof received !== 'string') return false
  const expectedBuf = Buffer.from(expected)
  const receivedBuf = Buffer.from(received)
  if (expectedBuf.length !== receivedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, receivedBuf)
}

export function createEvolutionWebhookRouter(queue: IQueue, env: Env): Router {
  const router = Router()

  router.post('/webhook/evolution', async (req, res) => {
    if (!isValidToken(req.query.token, env.EVOLUTION_WEBHOOK_SECRET)) {
      res.sendStatus(401)
      return
    }
    await queue.add('process-webhook', { provider: 'evolution', payload: req.body })
    res.sendStatus(200)
  })

  return router
}
