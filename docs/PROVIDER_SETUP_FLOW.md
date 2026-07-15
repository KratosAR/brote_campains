# Provider Setup Flow — User-Friendly Configuration

**Objective:** Make it dead-simple for non-technical users to connect WhatsApp, Email, SMS, and other messaging providers.

## User Journey

```
1. User opens Settings → Messaging Providers
   ↓
2. Selects a channel (WhatsApp, Email, SMS)
   ↓
3. Chooses a provider for that channel
   ├─ WhatsApp: Meta, Evolution
   ├─ Email: SMTP, Sendgrid
   └─ SMS: Twilio, Vonage
   ↓
4. Enters credentials (guided form)
   ├─ Phone number
   ├─ API keys / tokens
   └─ Account details
   ↓
5. Clicks "Test Connection"
   ├─ Backend validates credentials
   ├─ Shows ✅ or ❌
   └─ On success: saves encrypted
   ↓
6. Provider active & ready to send
   └─ Can switch to another provider anytime
```

## UI/UX Principles

### Simple
- One provider per channel at a time (no multi-provider complexity)
- Guided forms (not raw JSON)
- Clear instructions for each field

### Safe
- All credentials stored encrypted in database
- "Test Connection" before saving (prevents invalid configs)
- No credentials in logs or API responses

### Flexible
- Users can disconnect and reconnect
- Switch providers without data loss
- Different channels can use different providers

## Data Model

```typescript
// ChannelConnection (already exists)
interface ChannelConnection {
  id: string
  workspaceId: string
  channel: 'WhatsApp' | 'Email' | 'SMS' | 'Telegram'
  providerId: string  // 'meta' | 'evolution' | 'smtp' | 'twilio'
  credentials: {      // encrypted in database
    // Meta WhatsApp
    phoneNumberId?: string
    accessToken?: string
    
    // Evolution WhatsApp
    baseUrl?: string
    apiKey?: string
    instanceName?: string
    
    // SMTP Email
    host?: string
    port?: number
    email?: string
    password?: string
    
    // Twilio SMS
    accountSid?: string
    authToken?: string
    fromNumber?: string
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

## API Endpoints (Already Exist / To Build)

### 1. Get Available Providers
```
GET /workspaces/{id}/providers

Response:
{
  "success": true,
  "data": {
    "whatsapp": [
      {
        "id": "meta",
        "name": "Meta WhatsApp Business",
        "icon": "meta-logo",
        "fields": [
          { "name": "phoneNumberId", "label": "Phone Number ID", "type": "text", "required": true },
          { "name": "accessToken", "label": "Access Token", "type": "password", "required": true }
        ]
      },
      {
        "id": "evolution",
        "name": "Evolution API (Open Source)",
        "icon": "evolution-logo",
        "fields": [
          { "name": "baseUrl", "label": "Evolution Server URL", "type": "url", "required": true },
          { "name": "apiKey", "label": "API Key", "type": "password", "required": true },
          { "name": "instanceName", "label": "Instance Name", "type": "text", "required": true }
        ]
      }
    ],
    "email": [
      {
        "id": "smtp",
        "name": "SMTP (Gmail, Outlook, etc)",
        "icon": "email-logo",
        "fields": [
          { "name": "host", "label": "SMTP Host", "type": "text", "required": true },
          { "name": "port", "label": "Port", "type": "number", "required": true },
          { "name": "email", "label": "Email Address", "type": "email", "required": true },
          { "name": "password", "label": "Password / App Password", "type": "password", "required": true }
        ]
      }
    ],
    "sms": [
      {
        "id": "twilio",
        "name": "Twilio",
        "icon": "twilio-logo",
        "fields": [
          { "name": "accountSid", "label": "Account SID", "type": "text", "required": true },
          { "name": "authToken", "label": "Auth Token", "type": "password", "required": true },
          { "name": "fromNumber", "label": "From Number", "type": "tel", "required": true }
        ]
      }
    ]
  }
}
```

### 2. Get Current Connections
```
GET /workspaces/{id}/channels

Response:
{
  "success": true,
  "data": [
    {
      "channel": "WhatsApp",
      "provider": "meta",
      "providerName": "Meta WhatsApp Business",
      "isActive": true,
      "maskedCredentials": {
        "phoneNumberId": "1138669749338044",
        "accessToken": "EAAG*****...****"  // only last 8 chars visible
      },
      "lastTestedAt": "2026-07-14T22:30:00Z",
      "connectionStatus": "healthy"  // or "error"
    }
  ]
}
```

### 3. Connect Provider (Save Credentials)
```
POST /workspaces/{id}/channels/connect

Request:
{
  "channel": "WhatsApp",
  "providerId": "meta",
  "credentials": {
    "phoneNumberId": "1138669749338044",
    "accessToken": "EAAG..."
  }
}

Response:
{
  "success": true,
  "data": {
    "channelConnectionId": "01KXHNCD...",
    "channel": "WhatsApp",
    "provider": "meta",
    "isActive": true,
    "message": "✅ Connection successful. Ready to send messages."
  }
}
```

### 4. Test Connection (Before Saving)
```
POST /workspaces/{id}/channels/test-connection

Request:
{
  "channel": "WhatsApp",
  "providerId": "meta",
  "credentials": {
    "phoneNumberId": "1138669749338044",
    "accessToken": "EAAG..."
  }
}

Response:
{
  "success": true,
  "data": {
    "isConnected": true,
    "message": "✅ Successfully connected to Meta WhatsApp",
    "details": {
      "phoneNumber": "+1(555)154-6755",
      "accountStatus": "active",
      "messageRate": "60 per minute"
    }
  }
}

// Or on error:
{
  "success": false,
  "error": "❌ Invalid access token. Check Meta App Dashboard."
}
```

### 5. Disconnect Provider
```
DELETE /workspaces/{id}/channels/{channel}

Response:
{
  "success": true,
  "data": {
    "channel": "WhatsApp",
    "message": "Disconnected. Campaigns using WhatsApp will fail until reconfigured."
  }
}
```

## Frontend Implementation Flow

### Step 1: Show Available Providers
```typescript
// Fetch available providers
const providers = await fetch('/workspaces/{id}/providers').then(r => r.json())

// Display UI: "Which provider do you use?"
// - Meta WhatsApp Business
// - Evolution API (Open Source)
// - ... etc
```

### Step 2: Dynamic Form
```typescript
// User selects "Meta WhatsApp"
// Show guided form with fields from response:
// [Phone Number ID] _______________
// [Access Token]    _______________
// [Test Connection] [Save & Connect]
```

### Step 3: Validate Before Saving
```typescript
// User clicks "Test Connection"
const result = await fetch('/workspaces/{id}/channels/test-connection', {
  method: 'POST',
  body: JSON.stringify({
    channel: 'WhatsApp',
    providerId: 'meta',
    credentials: { phoneNumberId, accessToken }
  })
})

if (result.success) {
  // Show ✅ and enable "Save" button
  // Credentials are NOT yet saved
} else {
  // Show ❌ and display error
  // User can edit and retry
}
```

### Step 4: Save
```typescript
// User clicks "Save & Connect"
await fetch('/workspaces/{id}/channels/connect', {
  method: 'POST',
  body: JSON.stringify({
    channel: 'WhatsApp',
    providerId: 'meta',
    credentials: { phoneNumberId, accessToken }
  })
})

// Credentials encrypted and stored
// Ready to send campaigns
```

## Security Checklist

- [ ] All credentials encrypted at rest (AES-256)
- [ ] No credentials in API logs
- [ ] No credentials in error messages (show generic "invalid credentials" instead)
- [ ] Access tokens masked in UI (show only last 8 chars)
- [ ] "Test Connection" validates format before server call
- [ ] Rate limiting on test/connect endpoints (prevent credential brute-force)

## Provider Matrix

| Channel | Provider | Status | Complexity | Cost |
|---------|----------|--------|------------|------|
| **WhatsApp** | Meta Business API | ✅ Live | Medium | $0.0011-0.0175 per msg |
| | Evolution API (Baileys) | ✅ Live | Low | Free (self-hosted) |
| | Twilio | 🔄 Ready | Medium | $0.01-0.05 per msg |
| **Email** | SMTP (Gmail, Outlook) | 🔄 Ready | Low | Free |
| | Sendgrid | 🔄 Ready | Low | $10-80/mo |
| **SMS** | Twilio | 🔄 Ready | Low | $0.01-0.05 per msg |
| | Vonage | 🔄 Ready | Low | $0.04-0.06 per msg |
| **Telegram** | Telegram Bot API | 🔄 Ready | Low | Free |

✅ = Implemented  
🔄 = Code ready, needs config  
❌ = Not started

## Example: Setup Flow for User

### Scenario: Non-technical user wants to send WhatsApp messages

```
1. User logs into dashboard
2. Clicks "Settings" → "Messaging"
3. Sees: "Which channels do you want to enable?"
   - [ ] WhatsApp
   - [ ] Email
   - [ ] SMS
4. Checks WhatsApp
5. Sees: "How will you send WhatsApp messages?"
   - Meta WhatsApp Business (✓ Recommended for businesses)
   - Evolution API (Open source, self-hosted)
6. Clicks "Meta WhatsApp Business"
7. Form appears:
   
   ┌─ Configure Meta WhatsApp ──────────┐
   │                                     │
   │ Phone Number ID *                  │
   │ [________________________]           │
   │                                     │
   │ Access Token *                      │
   │ [________________________]           │
   │                                     │
   │ 📖 Need help? → [Get Credentials]   │
   │                                     │
   │ [Test Connection]  [Cancel]         │
   └─────────────────────────────────────┘

8. User enters credentials from Meta Dashboard
9. Clicks "Test Connection"
   ✅ Connected! Phone: +1(555)154-6755
10. Clicks "Save"
11. Sees success: "WhatsApp ready! Send messages now."
12. Can now create campaigns with WhatsApp
```

## Error Handling

### Invalid Credentials
```
❌ Authentication failed
→ Check your Access Token in Meta Dashboard
→ Token should start with "EAAG..."
```

### Network Error
```
❌ Could not reach Evolution Server at http://localhost:8080
→ Ensure Evolution API is running
→ Check firewall settings
```

### Rate Limited
```
⚠️ Too many test attempts. Wait 60 seconds before retrying.
→ To avoid credential theft, we limit repeated attempts
```

## Monitoring & Support

### Health Check Dashboard
```
WhatsApp (Meta)
  ✅ Connected
  📞 Phone: +1(555)154-6755
  🕐 Last tested: 2 minutes ago
  📊 Messages sent: 1,245

Email (SMTP)
  ❌ Disconnected
  ⏱️ Last error: 3 hours ago
  💡 Action: Reconnect with new app password

SMS (Twilio)
  ✅ Connected
  📞 From: +1-555-123-4567
  📊 Messages sent: 342
```

---

**Next: Implement frontend components for this flow.** 🚀
