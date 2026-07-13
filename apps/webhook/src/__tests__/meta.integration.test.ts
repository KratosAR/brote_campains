import crypto from 'crypto'
import request from 'supertest'

import { IQueue } from '@bcp/contracts'

import { createApp } from '../app'
import { Env } from '../config/env'

const env: Env = {
  PORT: 3002,
  REDIS_URL: 'redis://localhost:6379',
  WEBHOOK_VERIFY_TOKEN: 'verify-me',
  META_APP_SECRET: 'app-secret',
  EVOLUTION_WEBHOOK_SECRET: 'evolution-secret',
}

function sign(body: unknown, secret: string): string {
  const raw = JSON.stringify(body)
  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return `sha256=${hmac}`
}

class FakeQueue implements IQueue {
  public jobs: Array<{ jobName: string; data: unknown }> = []
  async add(jobName: string, data: unknown): Promise<void> {
    this.jobs.push({ jobName, data })
  }
}

describe('Meta webhook', () => {
  it('GET /webhook/meta returns the challenge when the token matches', async () => {
    const app = createApp(new FakeQueue(), env)
    const res = await request(app)
      .get('/webhook/meta')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'verify-me', 'hub.challenge': '12345' })

    expect(res.status).toBe(200)
    expect(res.text).toBe('12345')
  })

  it('GET /webhook/meta returns 403 when the token does not match', async () => {
    const app = createApp(new FakeQueue(), env)
    const res = await request(app)
      .get('/webhook/meta')
      .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '12345' })

    expect(res.status).toBe(403)
  })

  it('POST /webhook/meta rejects without a valid signature', async () => {
    const app = createApp(new FakeQueue(), env)
    const res = await request(app)
      .post('/webhook/meta')
      .send({ entry: [] })

    expect(res.status).toBe(401)
  })

  it('POST /webhook/meta accepts and enqueues when the signature is valid', async () => {
    const queue = new FakeQueue()
    const app = createApp(queue, env)
    const body = { entry: [{ id: '1' }] }

    const res = await request(app)
      .post('/webhook/meta')
      .set('X-Hub-Signature-256', sign(body, env.META_APP_SECRET))
      .send(body)

    expect(res.status).toBe(200)
    expect(queue.jobs).toEqual([{ jobName: 'process-webhook', data: { provider: 'meta', payload: body } }])
  })
})
