import { ProviderError } from '@bcp/contracts'
import type {
  MessagingProvider,
  OutboundMessage,
  ProviderResponse,
  HealthStatus,
  ProviderCapabilities,
} from '@bcp/contracts'

export interface EvolutionProviderConfig {
  baseUrl: string
  apiKey: string
  instanceName: string
}

// ponytail: bloquea IPs literales privadas/loopback/link-local (incluye el rango de metadata
// cloud 169.254.169.254) para frenar el SSRF más obvio contra `baseUrl` cargado por el usuario.
// No resuelve DNS rebinding (hostname público que resuelve a IP privada) — si eso importa,
// hace falta validar la IP resuelta en el momento del fetch, no solo el string de configuración.
const PRIVATE_HOST_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\.0\.0\.0$/,
  /^localhost$/i,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd00:/i,
]

function assertSafeUrl(rawUrl: string): void {
  let hostname: string
  try {
    hostname = new URL(rawUrl).hostname
  } catch {
    throw new ProviderError('PermanentError', `Invalid Evolution baseUrl: ${rawUrl}`)
  }
  if (PRIVATE_HOST_PATTERNS.some((pattern) => pattern.test(hostname))) {
    throw new ProviderError('PermanentError', `Evolution baseUrl points to a disallowed private host: ${hostname}`)
  }
}

// ponytail: shape typed loosely as unknown-ish records — Evolution API's docs
// don't guarantee a stable schema. Tighten with real response samples if
// this ever bites in prod.
function errorKindForStatus(status: number): ProviderError['kind'] {
  if (status === 429) return 'RateLimitError'
  if (status === 401 || status === 403) return 'AuthError'
  if (status >= 500) return 'TemporaryError'
  return 'PermanentError'
}

async function extractErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string }
    return body.message ?? body.error ?? res.statusText
  } catch {
    return res.statusText
  }
}

export class EvolutionProvider implements MessagingProvider {
  readonly providerId = 'evolution'

  constructor(private readonly config: EvolutionProviderConfig) {}

  // ponytail: `credentials` (por ChannelConnection) pisa la config del constructor cuando
  // viene informado — permite validar/usar lo que el usuario cargó en POST /channels/connect
  // en vez de siempre pegarle a la instancia fija de env vars.
  private resolveConfig(credentials?: unknown): EvolutionProviderConfig {
    if (!credentials || typeof credentials !== 'object') return this.config
    const c = credentials as Partial<EvolutionProviderConfig>
    if (!c.baseUrl || !c.apiKey || !c.instanceName) return this.config
    return { ...this.config, ...c }
  }

  private headersFor(config: EvolutionProviderConfig): Record<string, string> {
    return { apikey: config.apiKey }
  }

  private async fetchConnectionState(config: EvolutionProviderConfig): Promise<{ state?: string } | null> {
    assertSafeUrl(config.baseUrl)
    const res = await fetch(`${config.baseUrl}/instance/connectionState/${config.instanceName}`, {
      headers: this.headersFor(config),
    })
    if (!res.ok) {
      throw new Error(`connectionState request failed: ${res.status}`)
    }
    const body = (await res.json()) as { instance?: { state?: string } }
    return body.instance ?? null
  }

  async connect(credentials?: unknown): Promise<void> {
    const config = this.resolveConfig(credentials)
    let instance: { state?: string } | null = null
    try {
      instance = await this.fetchConnectionState(config)
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError('AuthError', `evolution connect failed: ${(error as Error).message}`)
    }
    if (instance?.state !== 'open') {
      throw new ProviderError('AuthError', 'evolution instance is not authenticated')
    }
  }

  async send(message: OutboundMessage, credentials?: unknown): Promise<ProviderResponse> {
    const config = this.resolveConfig(credentials)
    assertSafeUrl(config.baseUrl)
    const isMedia = Boolean(message.mediaUrl)
    const path = isMedia ? 'message/sendMedia' : 'message/sendText'
    const body = isMedia
      ? { number: message.to, mediatype: 'image', media: message.mediaUrl, caption: message.body }
      : { number: message.to, text: message.body }

    const res = await fetch(`${config.baseUrl}/${path}/${config.instanceName}`, {
      method: 'POST',
      headers: { ...this.headersFor(config), 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errorMessage = await extractErrorMessage(res)
      throw new ProviderError(errorKindForStatus(res.status), errorMessage)
    }

    const raw = (await res.json()) as { id?: string; key?: { id?: string } }
    const providerMessageId = raw.key?.id ?? raw.id ?? ''

    return { providerMessageId, timestamp: new Date(), raw }
  }

  async health(credentials?: unknown): Promise<HealthStatus> {
    const config = this.resolveConfig(credentials)
    const start = Date.now()
    try {
      const instance = await this.fetchConnectionState(config)
      const latencyMs = Date.now() - start
      if (instance?.state === 'open') {
        return { status: 'online', latencyMs }
      }
      return { status: 'degraded', latencyMs, details: `instance state: ${instance?.state ?? 'unknown'}` }
    } catch (error) {
      return { status: 'offline', latencyMs: Date.now() - start, details: (error as Error).message }
    }
  }

  capabilities(): ProviderCapabilities {
    return { supportsTemplates: false, supportsMedia: true, supportsButtons: true, maxMessagesPerMinute: 30 }
  }
}
