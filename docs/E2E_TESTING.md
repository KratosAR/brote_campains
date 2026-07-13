# BCP End-to-End Testing — Sprint 9 Phase 4

Complete user journey tests verifying all system components working together.

## Overview

E2E tests simulate real user workflows:
1. **Register workspace & user**
2. **Authenticate (login)**
3. **Create contact**
4. **Create template**
5. **Create campaign**
6. **Send campaign**
7. **Verify deliveries**
8. **Connect provider** (stub test)

## Running E2E Tests

### Setup

```bash
# 1. Start infrastructure (PostgreSQL, Redis, etc.)
docker compose up -d

# 2. Run migrations
pnpm db:migrate

# 3. Start API server
pnpm dev:api

# 4. In another terminal, run E2E tests
cd apps/api
pnpm jest --config jest.config.e2e.js
```

### Single Test

```bash
cd apps/api
pnpm jest --config jest.config.e2e.js fullWorkflow.test.ts
```

### Watch Mode (Development)

```bash
cd apps/api
pnpm jest --config jest.config.e2e.js --watch
```

## Test Structure

Each test is independent and can run in isolation:

```typescript
it('should register workspace and user', async () => {
  const response = await client.request<RegisterResponse>(
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

  expect(response.workspace.id).toBeDefined()
})
```

**Key patterns:**
- **Unique emails**: Use `Date.now()` to generate unique test data
- **Type safety**: Use TypeScript generics for API responses
- **Error handling**: Tests fail on HTTP errors (non-2xx status)
- **Assertions**: Jest expects for verification

## E2E Client API

The `E2EClient` class provides:

```typescript
async request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T>

setAccessToken(token: string): void
```

**Usage:**
```typescript
// Set auth token after login
client.setAccessToken(response.tokens.accessToken)

// Make authenticated requests
const result = await client.request<CampaignResponse>(
  'POST',
  `/workspaces/${workspaceId}/campaigns`,
  { /* payload */ }
)
```

## Test Data

Tests create fresh data for each run:

- **Emails**: `test-${Date.now()}@example.com`
- **Workspaces**: Auto-generated slugs to avoid conflicts
- **Contacts**: Single test contact per campaign
- **Templates**: Reused "Welcome Template" (SMS)

**Cleanup:** No explicit cleanup needed; demo data accumulates. Run `pnpm db:reset` between test cycles if needed.

## Failure Diagnosis

### Test Fails at Registration
- **Check:** API is running (`pnpm dev:api`)
- **Check:** Database is running and migrated (`pnpm db:migrate`)
- **Check:** `DATABASE_URL` is set correctly

### Test Fails at Campaign Creation
- **Check:** Template ID is valid
- **Check:** Contact ID exists and belongs to workspace
- **Check:** Workspace ID is correct

### Test Fails at Delivery Verification
- **Check:** Worker is running (handles campaign scheduling)
- **Check:** No provider connection = deliveries stay "pending"
- **Expected**: Deliveries exist with status like "pending", "sent", "delivered", or "failed"

## Extending E2E Tests

### Add a New Test Scenario

```typescript
it('should handle opt-out flow', async () => {
  // 1. Create contact
  const contact = await client.request<Contact>(
    'POST',
    `/workspaces/${workspaceId}/contacts`,
    { /* contact data */ }
  )

  // 2. Opt out contact
  await client.request(
    'POST',
    `/workspaces/${workspaceId}/contacts/${contact.id}/opt-out`,
    { reason: 'user-request' }
  )

  // 3. Verify status changed
  const updated = await client.request<Contact>(
    'GET',
    `/workspaces/${workspaceId}/contacts/${contact.id}`
  )
  expect(updated.status).toBe('opted-out')
})
```

### Add Custom Fixtures

```typescript
class E2EFixtures {
  static async createTestWorkspace(
    client: E2EClient
  ): Promise<{ workspaceId: string; tokens: AuthTokens }> {
    const response = await client.request<RegisterResponse>(
      'POST',
      '/auth/register',
      { /* ... */ }
    )
    return {
      workspaceId: response.workspace.id,
      tokens: response.tokens,
    }
  }
}

// Usage in test
beforeAll(async () => {
  const { workspaceId, tokens } = await E2EFixtures.createTestWorkspace(client)
  client.setAccessToken(tokens.accessToken)
})
```

## Performance Considerations

- **Test timeout**: 30 seconds per test (configured in `jest.config.e2e.js`)
- **Max workers**: 1 (sequential execution to avoid database conflicts)
- **API rate limits**: Tests send ~1 request per assertion; no rate limit issues expected

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E tests
  run: |
    docker compose up -d
    pnpm db:migrate
    pnpm dev:api &
    sleep 3  # Wait for API startup
    cd apps/api && pnpm jest --config jest.config.e2e.js
```

## Known Limitations

1. **Provider connection test is a stub**: Requires real Meta/Evolution credentials to test fully
2. **No UI testing**: Uses API directly (acceptable for MVP)
3. **No retry logic**: Tests fail immediately if API error occurs
4. **No load testing**: E2E tests are sequential and single-user

## Future Improvements

1. **Playwright/Puppeteer UI E2E**: Test actual web UI workflows
2. **Provider sandbox testing**: Mock provider APIs for full integration tests
3. **Concurrent E2E**: Run multiple user workflows in parallel
4. **Load testing**: Generate realistic campaign volumes to stress-test the system
5. **Chaos engineering**: Simulate provider failures and network issues

## Reference

- Test file: `apps/api/e2e/fullWorkflow.test.ts`
- Config: `apps/api/jest.config.e2e.js`
- E2E client: `apps/api/e2e/fullWorkflow.test.ts` (E2EClient class)
