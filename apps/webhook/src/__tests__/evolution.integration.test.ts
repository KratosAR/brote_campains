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

class FakeQueue implements IQueue {
  public jobs: Array<{ jobName: string; data: unknown }> = []
  async add(jobName: string, data: unknown): Promise<void> {
    this.jobs.push({ jobName, data })
  }
}

describe('Evolution webhook', () => {
  it('POST /webhook/evolution rejects without the shared secret token', async () => {
    const app = createApp(new FakeQueue(), env)
    const res = await request(app).post('/webhook/evolution').send({ event: 'messages.upsert', data: {} })

    expect(res.status).toBe(401)
  })

  it('POST /webhook/evolution rejects with the wrong token', async () => {
    const app = createApp(new FakeQueue(), env)
    const res = await request(app)
      .post('/webhook/evolution')
      .query({ token: 'wrong' })
      .send({ event: 'messages.upsert', data: {} })

    expect(res.status).toBe(401)
  })

  it('POST /webhook/evolution enqueues the payload when the token matches', async () => {
    const queue = new FakeQueue()
    const app = createApp(queue, env)
    const body = { event: 'messages.upsert', data: {} }

    const res = await request(app).post('/webhook/evolution').query({ token: env.EVOLUTION_WEBHOOK_SECRET }).send(body)

    expect(res.status).toBe(200)
    expect(queue.jobs).toEqual([{ jobName: 'process-webhook', data: { provider: 'evolution', payload: body } }])
  })
})
