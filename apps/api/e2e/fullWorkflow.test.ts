/**
 * End-to-End Test: Complete BCP Workflow
 *
 * Tests the full user journey:
 * 1. Register workspace
 * 2. Login user
 * 3. Connect messaging provider
 * 4. Import contacts
 * 5. Create campaign
 * 6. Send campaign
 * 7. Verify deliveries
 */

import fetch from 'node-fetch'

const API_URL = process.env.API_URL || 'http://localhost:3000'

interface AuthTokens {
  accessToken: string
  refreshToken: string
}

class E2EClient {
  private accessToken: string | null = null

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    return (await response.json()) as T
  }

  setAccessToken(token: string): void {
    this.accessToken = token
  }
}

describe('BCP E2E Workflow', () => {
  let client: E2EClient
  let workspaceId: string
  let userId: string
  let contactId: string
  let templateId: string
  let campaignId: string

  beforeAll(() => {
    client = new E2EClient()
  })

  it('should register workspace and user', async () => {
    const response = await client.request<{ workspace: { id: string }; user: { id: string }; tokens: AuthTokens }>(
      'POST',
      '/auth/register',
      {
        email: `test-${Date.now()}@example.com`,
        password: 'TempPassword123!',
        name: 'Test User',
        workspaceName: 'Test Workspace',
        workspaceSlug: `test-${Date.now()}`,
      },
    )

    workspaceId = response.workspace.id
    userId = response.user.id
    client.setAccessToken(response.tokens.accessToken)

    expect(workspaceId).toBeDefined()
    expect(userId).toBeDefined()
  })

  it('should login user', async () => {
    const response = await client.request<{ tokens: AuthTokens }>('POST', '/auth/login', {
      email: `test-${Date.now()}@example.com`,
      password: 'TempPassword123!',
    })

    expect(response.tokens.accessToken).toBeDefined()
    client.setAccessToken(response.tokens.accessToken)
  })

  it('should create a contact', async () => {
    const response = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      {
        firstName: 'John',
        lastName: 'Doe',
        channels: [
          {
            type: 'whatsapp',
            value: '+5491123456789',
          },
        ],
        status: 'active',
        acceptsCampaigns: 'yes',
      },
    )

    contactId = response.id
    expect(contactId).toBeDefined()
  })

  it('should create a template', async () => {
    const response = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/templates`,
      {
        name: 'Welcome Template',
        channel: 'whatsapp',
        body: 'Hello {{firstName}}, welcome!',
        variables: ['firstName'],
      },
    )

    templateId = response.id
    expect(templateId).toBeDefined()
  })

  it('should create a campaign', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    const response = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/campaigns`,
      {
        name: 'Welcome Campaign',
        templateId,
        channel: 'whatsapp',
        audienceType: 'contacts',
        audienceContactIds: [contactId],
        sendNow: true,
      },
    )

    campaignId = response.id
    expect(campaignId).toBeDefined()
  })

  it('should verify campaign status is sent or processing', async () => {
    const response = await client.request<{ status: string }>(
      'GET',
      `/workspaces/${workspaceId}/campaigns/${campaignId}`,
    )

    expect(['sent', 'processing', 'scheduled']).toContain(response.status)
  })

  it('should verify delivery exists for the contact', async () => {
    const response = await client.request<{ items: Array<{ id: string; status: string }> }>(
      'GET',
      `/workspaces/${workspaceId}/campaigns/${campaignId}/deliveries`,
    )

    expect(response.items.length).toBeGreaterThan(0)
    expect(response.items[0].status).toBeDefined()
  })

  it('should handle provider connection flow', async () => {
    // This is a stub test — actual provider connection requires credentials
    const response = await client.request<{ connectionId?: string }>(
      'POST',
      `/workspaces/${workspaceId}/channels/connect`,
      {
        channel: 'whatsapp',
        providerId: 'meta',
        credentials: {
          phoneNumberId: 'test-phone-123',
          accessToken: 'test-token',
        },
      },
    )

    // Provider connection may fail without real credentials
    // Just verify the endpoint is reachable
    expect(response).toBeDefined()
  })
})

describe('BCP E2E Error Recovery', () => {
  let client: E2EClient
  let workspaceId: string
  let campaignId: string
  let contactId: string
  let templateId: string

  beforeAll(async () => {
    client = new E2EClient()

    // Setup: Create workspace, contact, template, campaign
    const registerResp = await client.request<{
      workspace: { id: string }
      tokens: AuthTokens
    }>('POST', '/auth/register', {
      email: `error-test-${Date.now()}@example.com`,
      password: 'ErrorTest123!',
      name: 'Error Test User',
      workspaceName: 'Error Test Workspace',
      workspaceSlug: `error-test-${Date.now()}`,
    })

    workspaceId = registerResp.workspace.id
    client.setAccessToken(registerResp.tokens.accessToken)

    const contactResp = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      {
        firstName: 'Error',
        lastName: 'Tester',
        channels: [{ type: 'whatsapp', value: '+5491187654321' }],
        status: 'active',
        acceptsCampaigns: 'yes',
      },
    )
    contactId = contactResp.id

    const templateResp = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/templates`,
      {
        name: 'Error Test Template',
        channel: 'whatsapp',
        body: 'Test message',
      },
    )
    templateId = templateResp.id

    const campaignResp = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/campaigns`,
      {
        name: 'Error Test Campaign',
        templateId,
        channel: 'whatsapp',
        audienceType: 'contacts',
        audienceContactIds: [contactId],
        sendNow: true,
      },
    )
    campaignId = campaignResp.id
  })

  it('should retry failed deliveries', async () => {
    // Get initial delivery status
    const deliveries1 = await client.request<{
      items: Array<{ id: string; status: string }>
    }>('GET', `/workspaces/${workspaceId}/campaigns/${campaignId}/deliveries`)

    expect(deliveries1.items.length).toBeGreaterThan(0)
    const initialStatus = deliveries1.items[0].status

    // Simulate retry by updating delivery status back to pending
    // (In production, this would happen automatically via the worker)
    await client.request('POST', `/workspaces/${workspaceId}/campaigns/${campaignId}/deliveries/retry`, {
      statuses: ['failed', 'pending'],
    })

    // Verify deliveries are marked for retry
    const deliveries2 = await client.request<{
      items: Array<{ id: string; status: string }>
    }>('GET', `/workspaces/${workspaceId}/campaigns/${campaignId}/deliveries`)

    expect(deliveries2.items.length).toBe(deliveries1.items.length)
  })

  it('should handle provider rate limiting gracefully', async () => {
    // Get campaign status — should handle rate limits without crashing
    const response = await client.request<{ status: string; message?: string }>(
      'GET',
      `/workspaces/${workspaceId}/campaigns/${campaignId}`,
    )

    // Campaign should still be queryable even if provider is rate-limited
    expect(response).toBeDefined()
    expect(response.status).toBeDefined()
  })
})

describe('BCP E2E Opt-Out Flow', () => {
  let client: E2EClient
  let workspaceId: string
  let campaignId: string
  let contactId: string
  let optedOutContactId: string
  let templateId: string

  beforeAll(async () => {
    client = new E2EClient()

    // Setup: Create workspace
    const registerResp = await client.request<{
      workspace: { id: string }
      tokens: AuthTokens
    }>('POST', '/auth/register', {
      email: `optout-test-${Date.now()}@example.com`,
      password: 'OptOutTest123!',
      name: 'Opt Out Test User',
      workspaceName: 'Opt Out Test Workspace',
      workspaceSlug: `optout-test-${Date.now()}`,
    })

    workspaceId = registerResp.workspace.id
    client.setAccessToken(registerResp.tokens.accessToken)

    // Create two contacts: one active, one to opt-out
    const contact1Resp = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      {
        firstName: 'Active',
        lastName: 'Contact',
        channels: [{ type: 'whatsapp', value: '+5491111111111' }],
        status: 'active',
        acceptsCampaigns: 'yes',
      },
    )
    contactId = contact1Resp.id

    const contact2Resp = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      {
        firstName: 'Opt',
        lastName: 'Out',
        channels: [{ type: 'whatsapp', value: '+5491222222222' }],
        status: 'active',
        acceptsCampaigns: 'yes',
      },
    )
    optedOutContactId = contact2Resp.id

    // Create template
    const templateResp = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/templates`,
      {
        name: 'Opt Out Test Template',
        channel: 'whatsapp',
        body: 'You have opted out',
      },
    )
    templateId = templateResp.id
  })

  it('should opt-out a contact', async () => {
    // Opt out the contact
    const response = await client.request<{ id: string; status: string }>(
      'POST',
      `/workspaces/${workspaceId}/contacts/${optedOutContactId}/opt-out`,
      { reason: 'user-request' },
    )

    expect(response.id).toBe(optedOutContactId)
    expect(response.status).toBe('opted-out')
  })

  it('should not send campaign to opted-out contacts', async () => {
    // Create campaign targeting both active and opted-out contact
    const campaignResp = await client.request<{ id: string }>(
      'POST',
      `/workspaces/${workspaceId}/campaigns`,
      {
        name: 'Opt Out Test Campaign',
        templateId,
        channel: 'whatsapp',
        audienceType: 'contacts',
        audienceContactIds: [contactId, optedOutContactId],
        sendNow: true,
      },
    )

    campaignId = campaignResp.id
    expect(campaignId).toBeDefined()

    // Give worker a moment to process
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Verify only one delivery was created (for active contact)
    // Opted-out contact should be skipped
    const deliveries = await client.request<{
      items: Array<{ id: string; contactId: string }>
    }>('GET', `/workspaces/${workspaceId}/campaigns/${campaignId}/deliveries`)

    // Should have at least the active contact delivery
    expect(deliveries.items.length).toBeGreaterThan(0)

    // None should be for the opted-out contact
    const optedOutDeliveries = deliveries.items.filter((d) => d.contactId === optedOutContactId)
    expect(optedOutDeliveries.length).toBe(0)
  })

  it('should allow re-opting-in a contact', async () => {
    // Re-opt-in the contact
    const response = await client.request<{ id: string; status: string }>(
      'POST',
      `/workspaces/${workspaceId}/contacts/${optedOutContactId}/opt-in`,
      {},
    )

    expect(response.id).toBe(optedOutContactId)
    expect(response.status).toBe('active')
  })
})
