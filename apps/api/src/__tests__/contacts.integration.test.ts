import request from 'supertest'

import { createApp } from '../app'
import { createTestContainer } from './testContainer'

const JWT_SECRET = 'a'.repeat(32)

describe('Contacts HTTP flow', () => {
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

  it('creates a contact and finds it via search', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'contacts1@example.com')

    const created = await request(app)
      .post(`/workspaces/${workspaceId}/contacts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        identity: { firstName: 'John', lastName: 'Doe' },
        channels: [{ type: 'Email', value: 'john@example.com' }],
      })

    expect(created.status).toBe(201)
    expect(created.body.data.contactId).toEqual(expect.any(String))

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/contacts/${created.body.data.contactId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.status).toBe(200)
    expect(found.body.data.identity.firstName).toBe('John')

    const searched = await request(app)
      .get(`/workspaces/${workspaceId}/contacts`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(searched.status).toBe(200)
    expect(searched.body.data).toHaveLength(1)
    expect(searched.body.meta.total).toBe(1)
  })

  it('creates a group and adds a contact to it', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'contacts2@example.com')

    const contact = await request(app)
      .post(`/workspaces/${workspaceId}/contacts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        identity: { firstName: 'Jane' },
        channels: [{ type: 'Email', value: 'jane@example.com' }],
      })

    const group = await request(app)
      .post(`/workspaces/${workspaceId}/groups`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'VIPs' })

    expect(group.status).toBe(201)

    const added = await request(app)
      .post(`/workspaces/${workspaceId}/groups/${group.body.data.groupId}/contacts/${contact.body.data.contactId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(added.status).toBe(200)

    const groups = await request(app)
      .get(`/workspaces/${workspaceId}/groups`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(groups.status).toBe(200)
    expect(groups.body.data[0].contactCount).toBe(1)
  })

  it('opts out a contact', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'contacts3@example.com')

    const contact = await request(app)
      .post(`/workspaces/${workspaceId}/contacts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        identity: { firstName: 'Sam' },
        channels: [{ type: 'Email', value: 'sam@example.com' }],
      })

    const optOut = await request(app)
      .post(`/workspaces/${workspaceId}/contacts/${contact.body.data.contactId}/opt-out`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(optOut.status).toBe(200)

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/contacts/${contact.body.data.contactId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.body.data.optedOut).toBe(true)
  })

  it('rejects creating a contact without any channel', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'contacts4@example.com')

    const res = await request(app)
      .post(`/workspaces/${workspaceId}/contacts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ identity: { firstName: 'NoChannel' }, channels: [] })

    expect(res.status).toBe(400)
  })
})
