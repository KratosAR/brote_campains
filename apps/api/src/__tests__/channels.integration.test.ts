import request from 'supertest'

import { createApp } from '../app'
import { createTestContainer } from './testContainer'

const JWT_SECRET = 'a'.repeat(32)

describe('Channels HTTP flow', () => {
  function makeApp() {
    return createApp(createTestContainer(), JWT_SECRET)
  }

  async function registerWorkspace(app: ReturnType<typeof makeApp>, email: string) {
    const res = await request(app).post('/auth/register').send({
      ownerName: 'Ada',
      ownerEmail: email,
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })
    return res.body.data as { accessToken: string; workspaceId: string }
  }

  it('connects with valid credentials and creates a Connected connection', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'channels1@example.com')

    const res = await request(app)
      .post(`/workspaces/${workspaceId}/channels/connect`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'WhatsApp', providerId: 'test-ok', credentials: { token: 'valid' } })

    expect(res.status).toBe(201)
    expect(res.body.data.status).toBe('Connected')
    expect(res.body.data.providerId).toBe('test-ok')
  })

  it('returns a clear error when credentials are invalid', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'channels2@example.com')

    const res = await request(app)
      .post(`/workspaces/${workspaceId}/channels/connect`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'WhatsApp', providerId: 'test-fail', credentials: { token: 'invalid' } })

    expect(res.status).toBe(400)
    expect(res.body.success).toBe(false)
    expect(res.body.error).toEqual(expect.any(String))
  })

  it('lists channel connections for a workspace', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'channels3@example.com')
    await request(app)
      .post(`/workspaces/${workspaceId}/channels/connect`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'WhatsApp', providerId: 'test-ok', credentials: {} })

    const res = await request(app).get(`/workspaces/${workspaceId}/channels`).set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
  })

  it('gets channel status', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'channels4@example.com')
    await request(app)
      .post(`/workspaces/${workspaceId}/channels/connect`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'WhatsApp', providerId: 'test-ok', credentials: {} })

    const res = await request(app)
      .get(`/workspaces/${workspaceId}/channels/WhatsApp/status`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].channel).toBe('WhatsApp')
  })

  it('disconnects a channel connection', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'channels5@example.com')
    const created = await request(app)
      .post(`/workspaces/${workspaceId}/channels/connect`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'WhatsApp', providerId: 'test-ok', credentials: {} })
    const connectionId = created.body.data.id

    const res = await request(app)
      .post(`/workspaces/${workspaceId}/channels/${connectionId}/disconnect`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)

    const status = await request(app)
      .get(`/workspaces/${workspaceId}/channels/WhatsApp/status`)
      .set('Authorization', `Bearer ${accessToken}`)
    expect(status.body.data[0].status).toBe('Disconnected')
  })

  it('runs a health check on a channel connection', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'channels6@example.com')
    const created = await request(app)
      .post(`/workspaces/${workspaceId}/channels/connect`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'WhatsApp', providerId: 'test-ok', credentials: {} })
    const connectionId = created.body.data.id

    const res = await request(app)
      .post(`/workspaces/${workspaceId}/channels/${connectionId}/health-check`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('online')
  })
})
