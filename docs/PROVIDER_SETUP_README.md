# Provider Configuration — Complete Guide

**Making it dead-simple for users to connect WhatsApp, Email, SMS, and other messaging providers.**

---

## Documentation Map

### 📖 For End Users
→ **[PROVIDER_SETUP_QUICK_START.md](./PROVIDER_SETUP_QUICK_START.md)**
- Step-by-step setup for Meta WhatsApp, Evolution, SMTP, Twilio
- Credential gathering
- Troubleshooting

### 🎯 For Product/Design
→ **[PROVIDER_SETUP_FLOW.md](./PROVIDER_SETUP_FLOW.md)**
- User journey & wireflows
- API contracts (endpoints)
- Data model (ChannelConnection)
- Security checklist
- Error handling examples

### 👨‍💻 For Frontend Developers
→ **[PROVIDER_SETUP_FRONTEND_GUIDE.md](./PROVIDER_SETUP_FRONTEND_GUIDE.md)**
- Component architecture
- Code examples (React)
- API integration patterns
- Styling & accessibility
- Testing checklist

---

## Quick Overview

### What Problem Does This Solve?

**Before:** Users had to contact support to configure providers.  
**After:** Users self-serve in Settings → Messaging Providers (3 min setup).

---

### Key Principles

1. **Simple**: One provider per channel. Guided forms, not raw JSON.
2. **Safe**: Credentials encrypted. Test before saving. No secrets in logs.
3. **Flexible**: Switch providers anytime. Different channels can use different providers.

---

### Current Provider Support

| Channel | Provider | Status | Docs |
|---------|----------|--------|------|
| **WhatsApp** | Meta Business API | ✅ Live | [Setup](./PROVIDER_SETUP_QUICK_START.md#whatsapp-meta) |
| | Evolution (Baileys) | ✅ Live | [Setup](./PROVIDER_SETUP_QUICK_START.md#whatsapp-evolution--open-source) |
| **Email** | SMTP (Gmail, Outlook, etc) | 🔄 Ready | [Setup](./PROVIDER_SETUP_QUICK_START.md#email-smtp) |
| **SMS** | Twilio | 🔄 Ready | [Setup](./PROVIDER_SETUP_QUICK_START.md#sms-twilio) |

✅ = Implemented  
🔄 = Code ready, needs UI  
❌ = Not started

---

## User Experience

### Typical Flow (3 minutes)

```
1. User: Settings → Messaging Providers
2. User: Click "+ Connect WhatsApp"
3. User: Select "Meta WhatsApp Business"
4. User: Paste Phone Number ID + Access Token
5. System: "Test Connection" → ✅ Verified
6. User: "Save & Connect"
7. System: "WhatsApp ready! Send messages now."
8. User: Create campaign with WhatsApp channel → Send
```

---

## Backend Status

### Existing API Endpoints

All endpoints are already implemented:

```
GET  /workspaces/{id}/providers          # List available providers
GET  /workspaces/{id}/channels           # Get current connections
POST /workspaces/{id}/channels/connect   # Save credentials (encrypted)
POST /workspaces/{id}/channels/test-connection  # Validate before saving
DELETE /workspaces/{id}/channels/{channel}      # Disconnect provider
```

### Data Model

Credentials are stored encrypted in `channel_connections` table:

```typescript
interface ChannelConnection {
  id: string
  workspaceId: string
  channel: 'WhatsApp' | 'Email' | 'SMS'
  providerId: string  // 'meta' | 'evolution' | 'smtp' | 'twilio'
  credentials: { /* encrypted */ }
  isActive: boolean
}
```

---

## Frontend Implementation Roadmap

### Phase 1: Settings Page
- [ ] Create `ProviderSettings` component
- [ ] Display current connections as cards
- [ ] Show provider status (active/inactive)
- [ ] Add "+ Connect" button

### Phase 2: Setup Modal
- [ ] Channel selection (WhatsApp / Email / SMS)
- [ ] Provider selection (Meta / Evolution / SMTP / Twilio)
- [ ] Dynamic credential form
- [ ] Test connection button
- [ ] Confirmation & save

### Phase 3: Campaign Integration
- [ ] Show available providers in campaign creation
- [ ] Validate provider is configured before sending
- [ ] Display provider errors in delivery status
- [ ] Add provider switching in campaign editor

### Phase 4: Monitoring
- [ ] Provider health dashboard
- [ ] Last tested time & status
- [ ] Error logging
- [ ] Credential expiry warnings

---

## Example: Getting Started

### 1. Create Settings Page
```typescript
import { ProviderSettings } from '@/components/settings/ProviderSettings'

export function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <ProviderSettings />
    </div>
  )
}
```

### 2. Fetch Available Providers
```typescript
// In ProviderSettings.tsx
useEffect(() => {
  const providers = await fetch(
    `/workspaces/${workspaceId}/providers`
  ).then(r => r.json())
  setAvailableProviders(providers.data)
}, [workspaceId])
```

### 3. Show Connection Cards
```typescript
// Display current connections
currentConnections.map(conn => (
  <ChannelCard
    channel={conn.channel}
    provider={conn}
    onEdit={() => openModal(conn)}
    onDisconnect={() => disconnect(conn)}
  />
))
```

### 4. Setup Modal with Guided Steps
```typescript
// User clicks "+ Connect WhatsApp"
<ProviderModal
  onSelect={(channel, providerId) => {
    // Save & activate
  }}
  onClose={() => refetchConnections()}
/>
```

---

## Security Considerations

✅ **Implemented in Backend:**
- AES-256 encryption for credentials at rest
- No credentials in API logs
- Masked credentials in UI (only last 8 chars)
- Test-before-save prevents invalid configs

⚠️ **Frontend Responsibility:**
- Never log credentials to console
- Use HTTPS only
- Clear form after disconnect
- Validate field types before submission

---

## Testing Checklist

- [ ] All provider types can be configured
- [ ] Test Connection validates credentials
- [ ] Valid credentials save successfully
- [ ] Invalid credentials show helpful errors
- [ ] Can switch between providers
- [ ] Can disconnect and reconnect
- [ ] Messages send via configured provider
- [ ] Works on mobile/tablet
- [ ] Keyboard navigation works
- [ ] Screen reader announces status changes

---

## Troubleshooting

### "Test Connection Failed"
See [PROVIDER_SETUP_QUICK_START.md - Troubleshooting](./PROVIDER_SETUP_QUICK_START.md#%EF%B8%8F-troubleshooting)

### API Returns 400 on Connect
→ Check credentials format matches provider requirements  
→ Test connection first before saving

### Credentials Showing as Null
→ User clicked Save without completing all required fields  
→ Form validation should prevent this

### Provider Not Sending Messages
→ Verify `isActive: true` for channel  
→ Check provider status in health dashboard  
→ Review delivery error logs

---

## Next: Start Building

1. Read [PROVIDER_SETUP_FRONTEND_GUIDE.md](./PROVIDER_SETUP_FRONTEND_GUIDE.md)
2. Create `ProviderSettings` component
3. Integrate with campaign creation flow
4. Test with real Meta/Evolution credentials

**Frontend ready to implement!** 🚀

---

## Questions?

- Backend API: See [PROVIDER_SETUP_FLOW.md](./PROVIDER_SETUP_FLOW.md#api-endpoints-already-exist--to-build)
- User Setup: See [PROVIDER_SETUP_QUICK_START.md](./PROVIDER_SETUP_QUICK_START.md)
- Frontend Code: See [PROVIDER_SETUP_FRONTEND_GUIDE.md](./PROVIDER_SETUP_FRONTEND_GUIDE.md)
