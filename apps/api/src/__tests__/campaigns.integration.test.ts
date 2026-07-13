import request from 'supertest'

import { createApp } from '../app'
import { createTestContainer } from './testContainer'

const JWT_SECRET = 'a'.repeat(32)

describe('Campaigns HTTP flow', () => {
  function makeApp() {
    return createApp(createTestContainer(), JWT_SECRET)
  }

  async function registerWorkspace(app: ReturnType<typeof makeApp>, email: string) {
    const res = await request(app).post('/auth/register').send({
      ownerName: 'Ada',
      ownerEmail: email,
      ownerPassword: 'super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })
    return res.body.data as { accessToken: string; workspaceId: string }
  }

  async function createCampaign(app: ReturnType<typeof makeApp>, accessToken: string, workspaceId: string) {
    const res = await request(app)
      .post(`/workspaces/${workspaceId}/campaigns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Launch blast',
        channel: 'Email',
        audienceType: 'all',
        templateId: 'template-1',
      })
    return res
  }

  it('creates a campaign in Draft and retrieves it', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'campaigns1@example.com')

    const created = await createCampaign(app, accessToken, workspaceId)
    expect(created.status).toBe(201)
    expect(created.body.data.campaignId).toEqual(expect.any(String))

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/campaigns/${created.body.data.campaignId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.status).toBe(200)
    expect(found.body.data.name).toBe('Launch blast')
    expect(found.body.data.status).toBe('Draft')
  })

  it('schedules a campaign and moves it to Scheduled', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'campaigns2@example.com')
    const created = await createCampaign(app, accessToken, workspaceId)
    const campaignId = created.body.data.campaignId

    const scheduled = await request(app)
      .patch(`/workspaces/${workspaceId}/campaigns/${campaignId}/schedule`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ scheduledAt: new Date(Date.now() + 86400000).toISOString(), timezone: 'UTC' })

    expect(scheduled.status).toBe(200)

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.body.data.status).toBe('Scheduled')
  })

  it('cancels a campaign', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'campaigns3@example.com')
    const created = await createCampaign(app, accessToken, workspaceId)
    const campaignId = created.body.data.campaignId

    const cancelled = await request(app)
      .post(`/workspaces/${workspaceId}/campaigns/${campaignId}/cancel`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ reason: 'no longer needed' })

    expect(cancelled.status).toBe(200)

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.body.data.status).toBe('Cancelled')
  })

  it('rejects pausing a Draft campaign because it is not Running', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'campaigns4@example.com')
    const created = await createCampaign(app, accessToken, workspaceId)
    const campaignId = created.body.data.campaignId

    const paused = await request(app)
      .post(`/workspaces/${workspaceId}/campaigns/${campaignId}/pause`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})

    expect(paused.status).toBe(409)
  })

  it('duplicates a campaign into a new Draft', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'campaigns5@example.com')
    const created = await createCampaign(app, accessToken, workspaceId)
    const campaignId = created.body.data.campaignId

    const duplicated = await request(app)
      .post(`/workspaces/${workspaceId}/campaigns/${campaignId}/duplicate`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(duplicated.status).toBe(201)
    expect(duplicated.body.data.campaignId).not.toBe(campaignId)

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/campaigns/${duplicated.body.data.campaignId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.body.data.name).toBe('Launch blast (copy)')
    expect(found.body.data.status).toBe('Draft')
  })
})
