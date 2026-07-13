import crypto from 'crypto'
import { Router } from 'express'

import { IQueue } from '@bcp/contracts'

import { Env } from '../config/env'

function isValidSignature(rawBody: Buffer | undefined, signatureHeader: unknown, appSecret: string): boolean {
  if (!rawBody || typeof signatureHeader !== 'string' || !signatureHeader.startsWith('sha256=')) {
    return false
  }
  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  const received = signatureHeader.slice('sha256='.length)
  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(received, 'hex')
  if (expectedBuf.length !== receivedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, receivedBuf)
}

export function createMetaWebhookRouter(queue: IQueue, env: Env): Router {
  const router = Router()

  router.get('/webhook/meta', (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === env.WEBHOOK_VERIFY_TOKEN) {
      res.status(200).type('text/plain').send(String(challenge ?? ''))
      return
    }
    res.sendStatus(403)
  })

  router.post('/webhook/meta', async (req, res) => {
    const signature = req.headers['x-hub-signature-256']
    if (!isValidSignature(req.rawBody, signature, env.META_APP_SECRET)) {
      res.sendStatus(401)
      return
    }

    // ponytail: encolamos y respondemos 200 de inmediato; el procesamiento real
    // (mapear a Delivery.markSent/markDelivered/markRead/markFailed) vive en apps/worker.
    await queue.add('process-webhook', { provider: 'meta', payload: req.body })
    res.sendStatus(200)
  })

  return router
}
