import request from 'supertest'
import jwt from 'jsonwebtoken'

import { createApp } from '../app'
import { createTestContainer } from './testContainer'
import { Permission } from '@bcp/domain'
import { authenticate } from '../middleware/authenticate'
import { authorize } from '../middleware/authorize'

const JWT_SECRET = 'a'.repeat(32)

describe('Auth HTTP flow', () => {
  function makeApp() {
    return createApp(createTestContainer(), JWT_SECRET)
  }

  it('registers a workspace and issues a 24-hour access token', async () => {
    const app = makeApp()
    const res = await request(app).post('/auth/register').send({
      ownerName: 'Ada Lovelace',
      ownerEmail: 'ada@example.com',
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })

    expect(res.status).toBe(201)
    expect(res.body.data.accessToken).toEqual(expect.any(String))

    const decoded = jwt.decode(res.body.data.accessToken) as { iat: number; exp: number }
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60)
  })

  it('returns 401 for login with a wrong password, without revealing whether the email exists', async () => {
    const app = makeApp()
    await request(app).post('/auth/register').send({
      ownerName: 'Ada',
      ownerEmail: 'ada2@example.com',
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })

    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'ada2@example.com', password: 'wrong-password' })
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever' })

    expect(wrongPassword.status).toBe(401)
    expect(unknownEmail.status).toBe(401)
    expect(wrongPassword.body.error).toBe(unknownEmail.body.error)
  })

  it('rejects a refresh token that has already been used (rotation)', async () => {
    const app = makeApp()
    const register = await request(app).post('/auth/register').send({
      ownerName: 'Ada',
      ownerEmail: 'ada3@example.com',
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })
    const refreshToken = register.body.data.refreshToken

    const first = await request(app).post('/auth/refresh').send({ refreshToken })
    const second = await request(app).post('/auth/refresh').send({ refreshToken })

    expect(first.status).toBe(200)
    expect(second.status).toBe(401)
  })

  it('returns 401 for GET /workspaces/:id without a JWT', async () => {
    const app = makeApp()
    const res = await request(app).get('/workspaces/some-id')
    expect(res.status).toBe(401)
  })

  it('returns the workspace for an authenticated request', async () => {
    const app = makeApp()
    const register = await request(app).post('/auth/register').send({
      ownerName: 'Ada',
      ownerEmail: 'ada4@example.com',
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })
    const { accessToken, workspaceId } = register.body.data

    const res = await request(app)
      .get(`/workspaces/${workspaceId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(workspaceId)
  })

  it('returns 403 when requesting a workspace the token does not belong to (IDOR)', async () => {
    const app = makeApp()
    const wsA = await request(app).post('/auth/register').send({
      ownerName: 'Ada',
      ownerEmail: 'ada5@example.com',
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Workspace A',
      timezone: 'UTC',
    })
    const wsB = await request(app).post('/auth/register').send({
      ownerName: 'Bob',
      ownerEmail: 'bob@example.com',
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Workspace B',
      timezone: 'UTC',
    })

    const res = await request(app)
      .get(`/workspaces/${wsB.body.data.workspaceId}`)
      .set('Authorization', `Bearer ${wsA.body.data.accessToken}`)

    expect(res.status).toBe(403)
  })

  it('rejects inviting a user with the Owner role', async () => {
    const app = makeApp()
    const register = await request(app).post('/auth/register').send({
      ownerName: 'Ada',
      ownerEmail: 'ada6@example.com',
      ownerPassword: 'Super-secret-1',
      workspaceName: 'Ada Inc',
      timezone: 'UTC',
    })
    const { accessToken, workspaceId } = register.body.data

    const res = await request(app)
      .post(`/workspaces/${workspaceId}/users/invite`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ email: 'newowner@example.com', role: 'Owner' })

    expect(res.status).toBe(400)
  })

  it('returns 403 when a Viewer hits an endpoint requiring campaign:execute', async () => {
    const viewerToken = jwt.sign(
      { sub: 'user-1', workspaceId: 'ws-1', role: 'Viewer', permissions: ['campaign:view'] },
      JWT_SECRET,
      { expiresIn: '15m' },
    )

    const app = makeApp()
    // Mount a throwaway protected route to exercise the authorize() middleware,
    // since no campaign:execute endpoint exists yet (Sprint 3 scope).
    app.post(
      '/__test/campaign-execute',
      authenticate(JWT_SECRET),
      authorize(Permission.CampaignExecute),
      (_req: unknown, res: import('express').Response) => res.status(200).json({ success: true }),
    )

    const res = await request(app)
      .post('/__test/campaign-execute')
      .set('Authorization', `Bearer ${viewerToken}`)

    expect(res.status).toBe(403)
  })
})
