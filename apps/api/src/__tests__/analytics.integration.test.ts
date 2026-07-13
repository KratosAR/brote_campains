import request from 'supertest'
import { createApp } from '../app'
import { createTestContainer } from './testContainer'

const JWT_SECRET = 'a'.repeat(32)

describe('Analytics HTTP endpoints', () => {
  function makeApp() {
    return createApp(createTestContainer(), JWT_SECRET)
  }

  async function setupWorkspaceAndCampaigns(app: ReturnType<typeof makeApp>) {
    const registerRes = await request(app).post('/auth/register').send({
      ownerName: 'Test Owner',
      ownerEmail: 'analytics@example.com',
      ownerPassword: 'password-123',
      workspaceName: 'Analytics Test',
      timezone: 'UTC',
    })

    const { accessToken, workspaceId } = registerRes.body.data

    // Create a campaign
    const campaignRes = await request(app)
      .post(`/workspaces/${workspaceId}/campaigns`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Test Campaign',
        channel: 'Email',
        audienceType: 'all',
        templateId: 'template-1',
      })

    const campaignId = campaignRes.body.data.campaignId

    return { accessToken, workspaceId, campaignId }
  }

  it('GET /analytics/dashboard returns dashboard stats', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await setupWorkspaceAndCampaigns(app)

    const res = await request(app)
      .get(`/workspaces/${workspaceId}/analytics/dashboard?period=7d`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('activeCampaigns')
    expect(res.body.data).toHaveProperty('totalSent')
    expect(res.body.data).toHaveProperty('deliveryRate')
    expect(res.body.data).toHaveProperty('readRate')
    expect(res.body.data).toHaveProperty('recentActivity')
    expect(Array.isArray(res.body.data.recentActivity)).toBe(true)
  })

  it('GET /analytics/dashboard supports different periods', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await setupWorkspaceAndCampaigns(app)

    const periods = ['24h', '7d', '30d']

    for (const period of periods) {
      const res = await request(app)
        .get(`/workspaces/${workspaceId}/analytics/dashboard?period=${period}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.totalSent).toBeDefined()
    }
  })

  it('GET /analytics/campaigns/:campaignId returns campaign stats', async () => {
    const app = makeApp()
    const { accessToken, workspaceId, campaignId } = await setupWorkspaceAndCampaigns(app)

    const res = await request(app)
      .get(`/workspaces/${workspaceId}/analytics/campaigns/${campaignId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('campaignId', campaignId)
    expect(res.body.data).toHaveProperty('campaignName')
    expect(res.body.data).toHaveProperty('totalContacts')
    expect(res.body.data).toHaveProperty('deliveryRate')
    expect(res.body.data).toHaveProperty('hourlyDistribution')
    expect(Array.isArray(res.body.data.hourlyDistribution)).toBe(true)
  })

  it('GET /analytics/campaigns/compare compares multiple campaigns', async () => {
    const app = makeApp()
    const { accessToken, workspaceId, campaignId } = await setupWorkspaceAndCampaigns(app)

    const res = await request(app)
      .get(`/workspaces/${workspaceId}/analytics/campaigns/compare?ids=${campaignId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    if (res.body.data.length > 0) {
      expect(res.body.data[0]).toHaveProperty('campaignId')
      expect(res.body.data[0]).toHaveProperty('deliveryRate')
    }
  })

  it('GET /analytics/campaigns/top returns top campaigns by metric', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await setupWorkspaceAndCampaigns(app)

    const res = await request(app)
      .get(`/workspaces/${workspaceId}/analytics/campaigns/top?metric=deliveryRate&limit=5`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
    expect(res.body.data.length).toBeLessThanOrEqual(5)
  })

  it('GET /analytics/campaigns/:campaignId/deliveries breakdowns by status', async () => {
    const app = makeApp()
    const { accessToken, workspaceId, campaignId } = await setupWorkspaceAndCampaigns(app)

    const res = await request(app)
      .get(`/workspaces/${workspaceId}/analytics/campaigns/${campaignId}/deliveries?groupBy=status`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data).toHaveProperty('campaignId', campaignId)
    expect(res.body.data).toHaveProperty('total')
    expect(res.body.data).toHaveProperty('byStatus')
  })

  it('GET /analytics/campaigns/:campaignId/deliveries supports different groupBy', async () => {
    const app = makeApp()
    const { accessToken, workspaceId, campaignId } = await setupWorkspaceAndCampaigns(app)

    const groupBys = ['status', 'hour', 'provider']

    for (const groupBy of groupBys) {
      const res = await request(app)
        .get(`/workspaces/${workspaceId}/analytics/campaigns/${campaignId}/deliveries?groupBy=${groupBy}`)
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.total).toBeDefined()
    }
  })
})
