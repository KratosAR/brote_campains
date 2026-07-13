import type { HealthStatus, MessagingProvider, OutboundMessage, ProviderCapabilities, ProviderResponse } from '@bcp/contracts'

import { ProviderRegistry } from '../providers/ProviderRegistry'

class FakeProvider implements MessagingProvider {
  constructor(readonly providerId: string) {}
  async send(_message: OutboundMessage): Promise<ProviderResponse> {
    return { providerMessageId: 'fake-id', timestamp: new Date() }
  }
  async health(): Promise<HealthStatus> {
    return { status: 'online', latencyMs: 1 }
  }
  capabilities(): ProviderCapabilities {
    return { supportsTemplates: false, supportsMedia: false, supportsButtons: false, maxMessagesPerMinute: 60 }
  }
}

describe('ProviderRegistry', () => {
  it('registers and retrieves a provider by id', () => {
    const registry = new ProviderRegistry()
    const provider = new FakeProvider('fake-provider')
    registry.register(provider)

    const result = registry.get('fake-provider')
    expect(result.isOk()).toBe(true)
    expect(result.getValue()).toBe(provider)
  })

  it('fails with NotFoundError for unknown providerId', () => {
    const registry = new ProviderRegistry()
    const result = registry.get('missing')
    expect(result.isFail()).toBe(true)
  })

  it('lists all registered providers', () => {
    const registry = new ProviderRegistry()
    registry.register(new FakeProvider('a'))
    registry.register(new FakeProvider('b'))
    expect(registry.list()).toHaveLength(2)
  })
})
