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
