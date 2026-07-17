import request from 'supertest'

import { createApp } from '../app'
import { createTestContainer } from './testContainer'

const JWT_SECRET = 'a'.repeat(32)

describe('Templates HTTP flow', () => {
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

  it('creates a template and retrieves it', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'templates1@example.com')

    const created = await request(app)
      .post(`/workspaces/${workspaceId}/templates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Welcome', channel: 'Email', body: 'Hi {{name}}' })

    expect(created.status).toBe(201)
    expect(created.body.data.templateId).toEqual(expect.any(String))

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/templates/${created.body.data.templateId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.status).toBe(200)
    expect(found.body.data.name).toBe('Welcome')
    expect(found.body.data.activeVersion).toBe(1)
    expect(found.body.data.versions).toHaveLength(1)
  })

  it('creates a new version while keeping the previous one intact', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'templates2@example.com')

    const created = await request(app)
      .post(`/workspaces/${workspaceId}/templates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Welcome', channel: 'Email', body: 'Hi {{name}}' })
    const templateId = created.body.data.templateId

    const versioned = await request(app)
      .post(`/workspaces/${workspaceId}/templates/${templateId}/versions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ body: 'Hello {{name}}, welcome!' })

    expect(versioned.status).toBe(201)

    const previewV1 = await request(app)
      .post(`/workspaces/${workspaceId}/templates/${templateId}/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ version: 1, sampleValues: { name: 'John' } })

    expect(previewV1.status).toBe(200)
    expect(previewV1.body.data.rendered).toBe('Hi John')

    const previewActive = await request(app)
      .post(`/workspaces/${workspaceId}/templates/${templateId}/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sampleValues: { name: 'John' } })

    // ponytail: UpdateTemplateCommand only appends a version, it doesn't
    // activate it (see UpdateTemplateCommand's own comment) — active content
    // stays v1 until an activateVersion endpoint exists.
    expect(previewActive.status).toBe(200)
    expect(previewActive.body.data.rendered).toBe('Hi John')
  })

  it('rejects preview with a missing required variable', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'templates3@example.com')

    const created = await request(app)
      .post(`/workspaces/${workspaceId}/templates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Welcome', channel: 'Email', body: 'Hi {{name}}' })
    const templateId = created.body.data.templateId

    const preview = await request(app)
      .post(`/workspaces/${workspaceId}/templates/${templateId}/preview`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ sampleValues: {} })

    expect(preview.status).toBe(400)
  })

  it('archives a template', async () => {
    const app = makeApp()
    const { accessToken, workspaceId } = await registerWorkspace(app, 'templates4@example.com')

    const created = await request(app)
      .post(`/workspaces/${workspaceId}/templates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Welcome', channel: 'Email', body: 'Hi {{name}}' })
    const templateId = created.body.data.templateId

    const archived = await request(app)
      .delete(`/workspaces/${workspaceId}/templates/${templateId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(archived.status).toBe(200)

    const found = await request(app)
      .get(`/workspaces/${workspaceId}/templates/${templateId}`)
      .set('Authorization', `Bearer ${accessToken}`)

    expect(found.body.data.status).toBe('Archived')
  })
})
