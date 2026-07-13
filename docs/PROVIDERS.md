# Adding a New Provider to BCP

This guide walks you through adding a new communication provider (e.g., Twilio, SendGrid, Telegram) to BROTE Communication Platform.

## Architecture Overview

Providers in BCP follow a standardized interface:

```
┌─────────────────────────────────────────┐
│      Domain (Language-agnostic)         │
│  SendCampaignCommand, Delivery, etc.    │
└─────────────────────────────────────────┘
           ▲
           │ (Aggregate doesn't know providers exist)
           │
┌─────────────────────────────────────────┐
│      Application (Use case logic)       │
│  SendCampaignHandler, etc.              │
└─────────────────────────────────────────┘
           ▲
           │ depends on
           │
┌─────────────────────────────────────────┐
│    Infrastructure (Implementation)      │
│  ICommunicationProvider interface       │
└─────────────────────────────────────────┘
           ▲
           │ implemented by
           │
┌─────────────────────────────────────────┐
│   providers/{provider-name}/src/...     │
│  ConcreteProvider (e.g., TwilioProvider)│
└─────────────────────────────────────────┘
```

## Step 1: Define the Provider Interface

All providers implement `ICommunicationProvider` (defined in `packages/infrastructure/src/provider/ICommunicationProvider.ts`):

```typescript
export interface ICommunicationProvider {
  // Identify the provider
  getName(): string;
  
  // Test connection and credentials
  validate(credentials: Record<string, string>): Promise<Result<void, ValidationError>>;
  
  // Send single message
  send(
    request: SendRequest,
    credentials: Record<string, string>,
    logger: Logger,
  ): Promise<SendResponse>;
  
  // Optional: validate recipient before sending
  validateRecipient?(recipient: string): Result<void, ValidationError>;
  
  // Optional: handle rate limiting, backoff, etc.
  handleRateLimit?(retryAfter: number): Promise<void>;
}
```

## Step 2: Create Provider Directory

```bash
mkdir -p providers/{provider-name}/src
```

Example: `providers/twilio/`

**Structure:**
```
providers/twilio/
├── src/
│   ├── TwilioProvider.ts       # Main implementation
│   ├── TwilioError.ts          # Error handling
│   ├── validateCredentials.ts  # Validation logic
│   ├── __tests__/
│   │   └── TwilioProvider.test.ts
│   ├── package.json
│   ├── tsconfig.json
│   └── index.ts
├── README.md
└── .env.example
```

## Step 3: Implement the Provider

**providers/twilio/src/TwilioProvider.ts:**

```typescript
import { Result } from '@bcp/domain';
import { ICommunicationProvider, SendRequest, SendResponse } from '@bcp/infrastructure';
import twilio from 'twilio';
import { Logger } from 'pino';

export class TwilioProvider implements ICommunicationProvider {
  private client: twilio.Twilio | null = null;
  private accountSid: string = '';
  private authToken: string = '';
  private fromNumber: string = '';

  getName(): string {
    return 'twilio';
  }

  async validate(
    credentials: Record<string, string>,
  ): Promise<Result<void, Error>> {
    try {
      const { accountSid, authToken, fromNumber } = credentials;

      if (!accountSid || !authToken || !fromNumber) {
        return Result.fail(
          new Error(
            'Missing required credentials: accountSid, authToken, fromNumber',
          ),
        );
      }

      // Test connection
      const client = twilio(accountSid, authToken);
      await client.api.accounts(accountSid).fetch();

      this.client = client;
      this.accountSid = accountSid;
      this.authToken = authToken;
      this.fromNumber = fromNumber;

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(
        error instanceof Error
          ? error
          : new Error('Unknown validation error'),
      );
    }
  }

  validateRecipient(recipient: string): Result<void, Error> {
    // E.g., validate phone number format
    if (!recipient.match(/^\+?[1-9]\d{1,14}$/)) {
      return Result.fail(new Error(`Invalid phone number: ${recipient}`));
    }
    return Result.ok(undefined);
  }

  async send(
    request: SendRequest,
    credentials: Record<string, string>,
    logger: Logger,
  ): Promise<SendResponse> {
    try {
      const client = twilio(credentials.accountSid, credentials.authToken);

      const result = await client.messages.create({
        to: request.recipient,
        from: credentials.fromNumber,
        body: request.content,
      });

      logger.info(
        { messageId: result.sid, to: request.recipient },
        'Message sent via Twilio',
      );

      return {
        providerMessageId: result.sid,
        status: 'sent',
        sentAt: new Date(),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown Twilio error';
      logger.error({ error: message }, 'Twilio send failed');

      return {
        status: 'failed',
        error: message,
        sentAt: new Date(),
      };
    }
  }

  async handleRateLimit(retryAfter: number): Promise<void> {
    // Twilio uses 429 response; implement backoff if needed
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
  }
}
```

## Step 4: Add Type Definitions

**providers/twilio/src/index.ts:**

```typescript
export { TwilioProvider } from './TwilioProvider';
export * from './types';
```

## Step 5: Package Configuration

**providers/twilio/package.json:**

```json
{
  "name": "@bcp/provider-twilio",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "jest",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@bcp/domain": "workspace:*",
    "@bcp/infrastructure": "workspace:*",
    "twilio": "^4.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "typescript": "^5.0.0"
  }
}
```

**providers/twilio/tsconfig.json:**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/domain" },
    { "path": "../../packages/infrastructure" }
  ]
}
```

## Step 6: Register Provider in Container

Update `packages/infrastructure/src/container/ProviderFactory.ts`:

```typescript
import { TwilioProvider } from '@bcp/provider-twilio';

export class ProviderFactory {
  static createProvider(name: string): ICommunicationProvider {
    switch (name) {
      case 'meta':
        return new MetaProvider();
      case 'twilio':
        return new TwilioProvider();
      case 'evolution':
        return new EvolutionProvider();
      case 'fake':
        return new FakeProvider();
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
  }
}
```

Update root `pnpm-lock.yaml` to include the new provider in workspaces.

Update `turbo.json` build pipeline to include the provider package.

## Step 7: Add Tests

**providers/twilio/src/__tests__/TwilioProvider.test.ts:**

```typescript
import { TwilioProvider } from '../TwilioProvider';

describe('TwilioProvider', () => {
  let provider: TwilioProvider;

  beforeEach(() => {
    provider = new TwilioProvider();
  });

  it('should identify as twilio', () => {
    expect(provider.getName()).toBe('twilio');
  });

  it('should validate credentials', async () => {
    const result = await provider.validate({
      accountSid: 'invalid',
      authToken: 'invalid',
      fromNumber: '+1234567890',
    });

    expect(result.isFail()).toBe(true);
  });

  it('should validate phone numbers', () => {
    const result1 = provider.validateRecipient('+14155552671');
    expect(result1.isOk()).toBe(true);

    const result2 = provider.validateRecipient('invalid');
    expect(result2.isFail()).toBe(true);
  });

  it('should send messages', async () => {
    // Mock setup required
    // const result = await provider.send(...)
  });
});
```

## Step 8: Environment Variables

**.env.example:**

```bash
# Twilio Provider
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

## Step 9: Documentation

**providers/twilio/README.md:**

```markdown
# Twilio Provider for BCP

Enables SMS and WhatsApp delivery via Twilio.

## Setup

1. Create Twilio account at twilio.com
2. Get Account SID and Auth Token from dashboard
3. Configure sender number (must be verified)
4. Set environment variables (see .env.example)

## Configuration

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
```

## Limitations

- SMS length limited to 160 characters (or 1600 for long SMS)
- Recipient must be valid phone number (E.164 format)
- Twilio rate limits: ~200 msgs/sec per account

## Testing

```bash
cd providers/twilio
pnpm test
```
```

## Step 10: Build and Test

```bash
# Build the provider
pnpm build

# Run tests
pnpm test

# Verify it works with the platform
pnpm dev

# Test sending via API
curl -X POST http://localhost:3000/workspaces/{id}/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Twilio",
    "channelId": "twilio-channel-id",
    "templateId": "template-id",
    "contactIds": ["contact-id"]
  }'
```

## Integration Checklist

- [x] Interface implemented
- [x] Validation logic added
- [x] Send method implemented
- [x] Error handling added
- [x] Tests written (80%+ coverage)
- [x] Registered in ProviderFactory
- [x] Environment variables documented
- [x] README created
- [x] Builds without errors
- [x] CI pipeline passes

## Common Issues

**"Invalid credentials"**
- Verify Account SID and Auth Token in Twilio dashboard
- Check that sender number is verified

**"Invalid recipient"**
- Phone numbers must be E.164 format: +[country][number]
- E.g., +14155552671 for US, +5491138445555 for Argentina

**Rate limit errors**
- Twilio will return 429 status
- Implement backoff strategy (exponential)
- Use handleRateLimit() method

## Performance Considerations

- Connection pooling: Twilio client handles this
- Batch validation: Pre-validate all recipients before sending
- Caching: Store validated credentials in Redis with TTL
- Concurrency: Can send ~50-100 messages in parallel safely

## References

- Twilio Docs: https://www.twilio.com/docs
- Node SDK: https://github.com/twilio/twilio-node
- BCP Architecture: [../PROVIDERS.md](../PROVIDERS.md)
