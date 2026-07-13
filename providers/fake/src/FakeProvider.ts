import { randomUUID } from 'node:crypto'
import { ProviderError } from '@bcp/contracts'
import type {
  MessagingProvider,
  OutboundMessage,
  ProviderResponse,
  HealthStatus,
  ProviderCapabilities,
} from '@bcp/contracts'

// ponytail: un solo env var de tasa de éxito (YAGNI). El margen de falla se
// reparte fijo 60/40 entre TemporaryError/PermanentError; separar esas dos
// tasas en envs propios si el spec de un sprint futuro lo pide explícito.
// Leído en cada llamada (no cacheado a nivel de módulo) para que los tests
// puedan pisar process.env por caso.
function successRate(): number {
  return Number(process.env.FAKE_PROVIDER_SUCCESS_RATE ?? '0.95')
}

function randomDelayMs(): number {
  if (process.env.FAKE_PROVIDER_DELAY_MS) {
    return Number(process.env.FAKE_PROVIDER_DELAY_MS)
  }
  return 50 + Math.random() * 150
}

export class FakeProvider implements MessagingProvider {
  readonly providerId = 'fake'

  capabilities(): ProviderCapabilities {
    return { supportsTemplates: false, supportsMedia: false, supportsButtons: false, maxMessagesPerMinute: 1000 }
  }

  async send(_message: OutboundMessage): Promise<ProviderResponse> {
    await new Promise((resolve) => setTimeout(resolve, randomDelayMs()))

    if (Math.random() < successRate()) {
      return { providerMessageId: randomUUID(), timestamp: new Date() }
    }

    if (Math.random() < 0.6) {
      throw new ProviderError('TemporaryError', 'simulated 429 rate limit')
    }
    throw new ProviderError('PermanentError', 'invalid number')
  }

  async health(): Promise<HealthStatus> {
    return { status: 'online', latencyMs: 5 + Math.random() * 10 }
  }
}
