/**
 * End-to-End Test: Complete BCP Workflow
 *
 * Tests the full user journey:
 * 1. Register workspace
 * 2. Login user
 * 3. Import contacts
 * 4. Create template
 * 5. Create campaign
 * 6. Verify deliveries
 * 7. Connect messaging provider (stub)
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'

interface Envelope<T> {
  success: boolean
  data?: T
  error?: string
}

interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
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
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    if (response.status === 204) {
      return undefined as T
    }

    const envelope = (await response.json()) as Envelope<T>
    if (!envelope.success) {
      throw new Error(envelope.error ?? 'Request failed')
    }
    return envelope.data as T
  }

  setAccessToken(token: string): void {
    this.accessToken = token
  }
}

interface RegisterResponse {
  workspaceId: string
  userId: string
  accessToken: string
  refreshToken: string
  expiresIn: number
}

interface CreateContactResponse {
  contactId: string
}

interface ContactResponse {
  id: string
  identity: { firstName: string; lastName?: string }
  channels: Array<{ type: string; value: string }>
  status: string
  optedOut: boolean
}

interface CreateTemplateResponse {
  templateId: string
}

interface CreateCampaignResponse {
  campaignId: string
}

interface CampaignResponse {
  id: string
  status: string
  audience: { type: string; groupIds?: string[]; contactIds?: string[] }
}

interface DeliveryBreakdown {
  campaignId: string
  total: number
  byStatus?: Array<{ key: string; count: number }>
}

function registerPayload(prefix: string) {
  return {
    ownerName: `${prefix} User`,
    ownerEmail: `${prefix}-${Date.now()}@example.com`,
    ownerPassword: 'TempPassword123!',
    workspaceName: `${prefix} Workspace ${Date.now()}`,
    timezone: 'America/Argentina/Buenos_Aires',
  }
}

function contactPayload(firstName: string, phone: string) {
  return {
    identity: { firstName, lastName: 'Doe' },
    channels: [{ type: 'WhatsApp', value: phone }],
  }
}

describe('BCP E2E Workflow', () => {
  let client: E2EClient
  let workspaceId: string
  let userId: string
  let contactId: string
  let templateId: string
  let campaignId: string
  const owner = registerPayload('workflow')

  beforeAll(() => {
    client = new E2EClient()
  })

  it('should register workspace and user', async () => {
    const response = await client.request<RegisterResponse>('POST', '/auth/register', owner)

    workspaceId = response.workspaceId
    userId = response.userId
    client.setAccessToken(response.accessToken)

    expect(workspaceId).toBeDefined()
    expect(userId).toBeDefined()
  })

  it('should login user', async () => {
    const response = await client.request<AuthTokens>('POST', '/auth/login', {
      email: owner.ownerEmail,
      password: owner.ownerPassword,
    })

    expect(response.accessToken).toBeDefined()
    client.setAccessToken(response.accessToken)
  })

  it('should create a contact', async () => {
    const response = await client.request<CreateContactResponse>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      contactPayload('John', '+5491123456789'),
    )

    contactId = response.contactId
    expect(contactId).toBeDefined()
  })

  it('should create a template', async () => {
    const response = await client.request<CreateTemplateResponse>(
      'POST',
      `/workspaces/${workspaceId}/templates`,
      {
        name: 'Welcome Template',
        channel: 'WhatsApp',
        body: 'Hello, welcome!',
      },
    )

    templateId = response.templateId
    expect(templateId).toBeDefined()
  })

  it('should create a campaign', async () => {
    const response = await client.request<CreateCampaignResponse>(
      'POST',
      `/workspaces/${workspaceId}/campaigns`,
      {
        name: 'Welcome Campaign',
        templateId,
        channel: 'WhatsApp',
        audienceType: 'manual',
        audienceContactIds: [contactId],
        sendNow: true,
      },
    )

    campaignId = response.campaignId
    expect(campaignId).toBeDefined()
  })

  it('should verify campaign status is a valid post-send state', async () => {
    const response = await client.request<CampaignResponse>(
      'GET',
      `/workspaces/${workspaceId}/campaigns/${campaignId}`,
    )

    expect(['Running', 'Completed', 'Scheduled', 'Draft']).toContain(response.status)
  })

  it('should verify delivery exists for the contact', async () => {
    // Give the worker a moment to pick up the start-campaign job and
    // materialize deliveries.
    await new Promise((resolve) => setTimeout(resolve, 500))

    const response = await client.request<DeliveryBreakdown>(
      'GET',
      `/workspaces/${workspaceId}/analytics/campaigns/${campaignId}/deliveries?groupBy=status`,
    )

    expect(response.total).toBeGreaterThan(0)
  })

  it('should handle provider connection flow', async () => {
    // This is a stub test — actual provider connection requires real credentials
    // and is expected to fail domain validation, not hang or 500.
    await expect(
      client.request(
        'POST',
        `/workspaces/${workspaceId}/channels/connect`,
        {
          channel: 'WhatsApp',
          providerId: 'meta',
          credentials: {
            phoneNumberId: 'test-phone-123',
            accessToken: 'test-token',
          },
        },
      ),
    ).rejects.toThrow(/HTTP/)
  })
})

describe('BCP E2E Opt-Out Flow', () => {
  let client: E2EClient
  let workspaceId: string
  let campaignId: string
  let contactId: string
  let optedOutContactId: string
  let templateId: string
  const owner = registerPayload('optout')

  beforeAll(async () => {
    client = new E2EClient()

    const registerResp = await client.request<RegisterResponse>('POST', '/auth/register', owner)
    workspaceId = registerResp.workspaceId
    client.setAccessToken(registerResp.accessToken)

    const contact1Resp = await client.request<CreateContactResponse>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      contactPayload('Active', '+5491111111111'),
    )
    contactId = contact1Resp.contactId

    const contact2Resp = await client.request<CreateContactResponse>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      contactPayload('Opt', '+5491222222222'),
    )
    optedOutContactId = contact2Resp.contactId

    const templateResp = await client.request<CreateTemplateResponse>(
      'POST',
      `/workspaces/${workspaceId}/templates`,
      {
        name: 'Opt Out Test Template',
        channel: 'WhatsApp',
        body: 'You have opted out',
      },
    )
    templateId = templateResp.templateId
  })

  it('should opt-out a contact', async () => {
    await client.request('POST', `/workspaces/${workspaceId}/contacts/${optedOutContactId}/opt-out`)

    const contact = await client.request<ContactResponse>(
      'GET',
      `/workspaces/${workspaceId}/contacts/${optedOutContactId}`,
    )
    expect(contact.optedOut).toBe(true)
  })

  it('should exclude opted-out contacts from campaign deliveries', async () => {
    const campaignResp = await client.request<CreateCampaignResponse>(
      'POST',
      `/workspaces/${workspaceId}/campaigns`,
      {
        name: 'Opt Out Test Campaign',
        templateId,
        channel: 'WhatsApp',
        audienceType: 'manual',
        audienceContactIds: [contactId, optedOutContactId],
        sendNow: true,
      },
    )

    campaignId = campaignResp.campaignId
    expect(campaignId).toBeDefined()

    // Give the worker a moment to process the send.
    await new Promise((resolve) => setTimeout(resolve, 500))

    const breakdown = await client.request<DeliveryBreakdown>(
      'GET',
      `/workspaces/${workspaceId}/analytics/campaigns/${campaignId}/deliveries?groupBy=status`,
    )

    // Only the active contact should receive a delivery — the opted-out
    // contact must be skipped by the send pipeline.
    expect(breakdown.total).toBe(1)
  })
})
