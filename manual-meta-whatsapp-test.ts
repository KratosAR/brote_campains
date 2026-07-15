/**
 * Manual End-to-End Meta WhatsApp Test
 *
 * Sends a single real WhatsApp message and verifies delivery.
 *
 * Usage:
 * ```bash
 * # 1. Ensure .env has Meta credentials configured
 * # META_PHONE_NUMBER_ID=1138669749338044
 * # META_ACCESS_TOKEN=EAAGVMBd26pkBR6Wvt74QIB...
 *
 * # 2. Start infrastructure, API, and worker
 * docker compose -f docker/docker-compose.yml up -d
 * pnpm dev &
 * cd apps/worker && pnpm dev &
 *
 * # 3. Run this test from project root
 * npx ts-node manual-meta-whatsapp-test.ts
 * ```
 *
 * Expected output:
 * ✅ Workspace registered
 * ✅ Contact created (with your phone number)
 * ✅ Template created
 * ✅ Campaign sent
 * ✅ Delivery created and tracked
 * ✅ Check your WhatsApp for the message!
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'
const TEST_PHONE = process.env.TEST_PHONE || '+1(555)154-6755' // Meta test number

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
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

    const envelope = (await response.json()) as ApiResponse<T>
    if (!envelope.success) {
      throw new Error(envelope.error ?? 'Request failed')
    }
    return envelope.data as T
  }

  setAccessToken(token: string): void {
    this.accessToken = token
  }
}

async function run() {
  const client = new E2EClient()
  const timestamp = Date.now()

  try {
    console.log('\n📱 Manual End-to-End Meta WhatsApp Test\n')

    // 1. Register workspace
    console.log('1️⃣  Registering workspace...')
    const registerResp = await client.request<{
      workspaceId: string
      accessToken: string
    }>('POST', '/auth/register', {
      ownerName: 'Meta Test User',
      ownerEmail: `meta-test-${timestamp}@example.com`,
      ownerPassword: 'MetaTest123!',
      workspaceName: `Meta WhatsApp Test ${timestamp}`,
      timezone: 'America/Argentina/Buenos_Aires',
    })

    const workspaceId = registerResp.workspaceId
    client.setAccessToken(registerResp.accessToken)
    console.log('✅ Workspace registered:', workspaceId)

    // 2. Create contact
    console.log('\n2️⃣  Creating contact with phone:', TEST_PHONE)
    const contactResp = await client.request<{ contactId: string }>(
      'POST',
      `/workspaces/${workspaceId}/contacts`,
      {
        identity: { firstName: 'Meta Test' },
        channels: [{ type: 'WhatsApp', value: TEST_PHONE }],
      },
    )
    const contactId = contactResp.contactId
    console.log('✅ Contact created:', contactId)

    // 3. Create template
    console.log('\n3️⃣  Creating template...')
    const templateResp = await client.request<{ templateId: string }>(
      'POST',
      `/workspaces/${workspaceId}/templates`,
      {
        name: 'Meta Real Send Test',
        channel: 'WhatsApp',
        body: 'Hello from BCP! This is a real WhatsApp message sent via Meta WhatsApp Business API. 🚀',
      },
    )
    const templateId = templateResp.templateId
    console.log('✅ Template created:', templateId)

    // 4. Send campaign
    console.log('\n4️⃣  Sending campaign (sendNow=true)...')
    const campaignResp = await client.request<{ campaignId: string }>(
      'POST',
      `/workspaces/${workspaceId}/campaigns`,
      {
        name: 'Meta Real Send Test',
        templateId,
        channel: 'WhatsApp',
        audienceType: 'manual',
        audienceContactIds: [contactId],
        sendNow: true,
      },
    )
    const campaignId = campaignResp.campaignId
    console.log('✅ Campaign created and sent:', campaignId)

    // 5. Wait for worker to process
    console.log('\n5️⃣  Waiting for worker to process (2 seconds)...')
    await new Promise((r) => setTimeout(r, 2000))

    // 6. Check delivery status
    console.log('\n6️⃣  Checking delivery status...')
    const breakdown = await client.request<{
      campaignId: string
      total: number
      byStatus?: Array<{ key: string; count: number }>
    }>(
      'GET',
      `/workspaces/${workspaceId}/analytics/campaigns/${campaignId}/deliveries?groupBy=status`,
    )

    console.log('✅ Delivery breakdown:')
    console.log(`   Total: ${breakdown.total}`)
    if (breakdown.byStatus) {
      for (const status of breakdown.byStatus) {
        console.log(`   ${status.key}: ${status.count}`)
      }
    }

    if (breakdown.total > 0) {
      console.log('\n✅ SUCCESS! Message queued for delivery.')
      console.log('📱 Check your WhatsApp account for the message.')
      console.log('\n📊 Expected status flow:')
      console.log('   Pending → Sending → Sent → Delivered')
      console.log('\nℹ️  Check again in a few seconds if status is still "Pending".')
    } else {
      console.log('\n⚠️  No deliveries created. Check:')
      console.log('   • Worker is running (pnpm dev in apps/worker)')
      console.log('   • Meta credentials in .env are correct')
      console.log('   • Redis/PostgreSQL are connected')
    }

    console.log('\n' + '='.repeat(60) + '\n')
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

run()
