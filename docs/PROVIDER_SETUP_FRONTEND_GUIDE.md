# Provider Setup — Frontend Implementation Guide

**For developers: How to build the provider configuration UI.**

---

## Overview

The provider setup flow allows users to connect messaging providers (WhatsApp, Email, SMS) to their workspace. The frontend guides them through credential entry, testing, and activation.

---

## Component Structure

```
ProviderSettings (Main Page)
├── ChannelList (Show current connections)
│   ├── ChannelCard (WhatsApp: Meta / Status: Active)
│   ├── ChannelCard (Email: Disconnected)
│   └── ChannelCard (SMS: Disconnected)
│
└── AddProviderButton
    └── ProviderModal (Guides user through setup)
        ├── Step 1: SelectChannel (WhatsApp / Email / SMS)
        ├── Step 2: SelectProvider (Meta / Evolution / SMTP / Twilio)
        ├── Step 3: CredentialForm (Dynamic form based on provider)
        ├── Step 4: TestConnection (Shows result: ✅ or ❌)
        └── Step 5: Confirmation (Save & activate)
```

---

## Data Fetching

### 1. Get Available Providers
```typescript
async function getAvailableProviders(workspaceId: string) {
  const response = await fetch(`/workspaces/${workspaceId}/providers`)
  const { data } = await response.json()
  
  // data = {
  //   whatsapp: [{ id: 'meta', name: '...', fields: [...] }, ...],
  //   email: [...],
  //   sms: [...]
  // }
  
  return data
}
```

### 2. Get Current Connections
```typescript
async function getCurrentConnections(workspaceId: string) {
  const response = await fetch(`/workspaces/${workspaceId}/channels`)
  const { data } = await response.json()
  
  // data = [
  //   { channel: 'WhatsApp', provider: 'meta', isActive: true, ... },
  //   { channel: 'Email', provider: null, isActive: false, ... }
  // ]
  
  return data
}
```

---

## Component Examples

### ChannelCard (Display Current Connection)

```typescript
interface ChannelCardProps {
  channel: 'WhatsApp' | 'Email' | 'SMS'
  provider?: {
    name: string
    isActive: boolean
    lastTestedAt?: Date
    maskedCredentials?: Record<string, string>
  }
  onEdit: () => void
  onDisconnect: () => void
}

export function ChannelCard({ channel, provider, onEdit, onDisconnect }: ChannelCardProps) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <h3>{channel}</h3>
          {provider ? (
            <>
              <p className="text-sm text-gray-600">{provider.name}</p>
              <span className={`badge ${provider.isActive ? 'green' : 'gray'}`}>
                {provider.isActive ? '✅ Active' : '⚫ Inactive'}
              </span>
            </>
          ) : (
            <p className="text-sm text-gray-400">Not configured</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={onEdit}>Edit</button>
          {provider && <button onClick={onDisconnect}>Disconnect</button>}
        </div>
      </div>
    </div>
  )
}
```

### Provider Selection Modal

```typescript
interface ProviderModalProps {
  channels?: string[]  // Limit to specific channels
  onSelect: (channel: string, providerId: string) => void
  onClose: () => void
}

export function ProviderModal({ channels, onSelect, onClose }: ProviderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  
  const availableChannels = ['WhatsApp', 'Email', 'SMS']
  const availableProviders = getProvidersForChannel(selectedChannel)

  async function handleTestConnection() {
    const result = await testConnection(selectedChannel!, selectedProviderId!, credentials)
    setTestResult(result)
  }

  async function handleSave() {
    await connectProvider(selectedChannel!, selectedProviderId!, credentials)
    onSelect(selectedChannel!, selectedProviderId!)
    onClose()
  }

  return (
    <div className="modal">
      {step === 1 && (
        <div>
          <h2>Select Channel</h2>
          <div className="grid">
            {availableChannels.map((ch) => (
              <button
                key={ch}
                onClick={() => {
                  setSelectedChannel(ch)
                  setStep(2)
                }}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2>Select Provider for {selectedChannel}</h2>
          <div className="grid">
            {availableProviders.map((prov) => (
              <button
                key={prov.id}
                onClick={() => {
                  setSelectedProviderId(prov.id)
                  setStep(3)
                }}
              >
                <div>{prov.name}</div>
                <small>{prov.description}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2>Enter Credentials</h2>
          <CredentialForm
            provider={getProvider(selectedProviderId!)}
            values={credentials}
            onChange={setCredentials}
            onNext={() => setStep(4)}
          />
        </div>
      )}

      {step === 4 && (
        <div>
          <h2>Test Connection</h2>
          {testResult === null && (
            <button onClick={handleTestConnection}>
              Test Connection
            </button>
          )}
          {testResult?.success && (
            <div className="success">
              ✅ {testResult.message}
              <button onClick={() => setStep(5)}>Next</button>
            </div>
          )}
          {testResult?.success === false && (
            <div className="error">
              ❌ {testResult.message}
              <button onClick={() => setTestResult(null)}>Try Again</button>
            </div>
          )}
        </div>
      )}

      {step === 5 && (
        <div>
          <h2>Ready to Connect</h2>
          <p>Credentials verified. Click below to activate.</p>
          <button onClick={handleSave}>Save & Connect</button>
        </div>
      )}

      <button onClick={onClose}>Cancel</button>
    </div>
  )
}
```

### Dynamic Credential Form

```typescript
interface CredentialFieldProps {
  field: {
    name: string
    label: string
    type: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel'
    required: boolean
  }
  value: string
  onChange: (value: string) => void
}

function CredentialField({ field, value, onChange }: CredentialFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor={field.name}>
        {field.label} {field.required && '*'}
      </label>
      <input
        id={field.name}
        type={field.type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Enter ${field.label.toLowerCase()}`}
      />
    </div>
  )
}

interface CredentialFormProps {
  provider: ProviderConfig
  values: Record<string, string>
  onChange: (values: Record<string, string>) => void
  onNext: () => void
}

export function CredentialForm({ provider, values, onChange, onNext }: CredentialFormProps) {
  const isValid = provider.fields.every(
    (f) => !f.required || values[f.name]?.trim()
  )

  return (
    <div className="form">
      {provider.fields.map((field) => (
        <CredentialField
          key={field.name}
          field={field}
          value={values[field.name] || ''}
          onChange={(val) => onChange({ ...values, [field.name]: val })}
        />
      ))}
      <button disabled={!isValid} onClick={onNext}>
        Next
      </button>
    </div>
  )
}
```

---

## API Calls

### Test Connection
```typescript
async function testConnection(
  workspaceId: string,
  channel: string,
  providerId: string,
  credentials: Record<string, string>
) {
  const response = await fetch(
    `/workspaces/${workspaceId}/channels/test-connection`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        providerId,
        credentials
      })
    }
  )
  
  const { success, data, error } = await response.json()
  
  return {
    success,
    message: success 
      ? `✅ ${data.message}` 
      : `❌ ${error}`
  }
}
```

### Connect Provider
```typescript
async function connectProvider(
  workspaceId: string,
  channel: string,
  providerId: string,
  credentials: Record<string, string>
) {
  const response = await fetch(
    `/workspaces/${workspaceId}/channels/connect`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel,
        providerId,
        credentials
      })
    }
  )
  
  return response.json()
}
```

### Disconnect Provider
```typescript
async function disconnectProvider(
  workspaceId: string,
  channel: string
) {
  const response = await fetch(
    `/workspaces/${workspaceId}/channels/${channel}`,
    { method: 'DELETE' }
  )
  
  return response.json()
}
```

---

## Styling Guidelines

### Color Scheme
- **Active/Success**: Green (`#10b981`)
- **Inactive/Disconnected**: Gray (`#9ca3af`)
- **Error**: Red (`#ef4444`)
- **Info**: Blue (`#3b82f6`)

### Icons
- WhatsApp: Green speech bubble
- Email: Envelope
- SMS: Message with arrow
- ✅ Connected: Green checkmark
- ❌ Error: Red X
- ⏳ Testing: Spinner

---

## Error Handling

```typescript
async function handleProviderSetup() {
  try {
    // Step 1: Get available providers
    const providers = await getAvailableProviders(workspaceId)
    
    // Step 2: User selects & enters credentials
    // ... form steps ...
    
    // Step 3: Test connection
    const testResult = await testConnection(...)
    if (!testResult.success) {
      showError(testResult.message)
      return
    }
    
    // Step 4: Save
    await connectProvider(...)
    showSuccess('Provider connected!')
    
    // Step 5: Refresh list
    refetchConnections()
  } catch (error) {
    showError(error instanceof Error ? error.message : 'Unknown error')
  }
}
```

---

## Accessibility

- All fields have `<label>` elements
- Error messages linked to inputs via `aria-describedby`
- Test/Save buttons disabled until form is valid
- Keyboard navigation through steps
- ARIA live regions for test results

```typescript
<input
  id="phoneNumberId"
  aria-label="Phone Number ID"
  aria-describedby="phoneNumberId-error"
  required
/>
{error && <span id="phoneNumberId-error" role="alert">{error}</span>}
```

---

## Mobile Responsiveness

- Modal takes full screen on mobile
- Single column layout
- Larger touch targets (min 44px)
- Scrollable form on small screens

---

## Testing Checklist

- [ ] All provider types can be added
- [ ] Test Connection works and shows errors
- [ ] Credentials saved after success
- [ ] Can switch providers without data loss
- [ ] Can disconnect and reconnect
- [ ] Form validates before submission
- [ ] Error messages are helpful
- [ ] Mobile layout is usable
- [ ] Accessibility features work (keyboard, screen reader)

---

## Next Steps

1. Build `ProviderSettings` page component
2. Implement `ProviderModal` with step navigation
3. Add `CredentialForm` with dynamic field generation
4. Wire up API calls (test & connect)
5. Add error handling and loading states
6. Test on mobile
7. Add to navigation/settings menu

**Ready to build!** 🚀
