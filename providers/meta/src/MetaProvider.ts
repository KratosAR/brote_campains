import { ProviderError } from '@bcp/contracts'
import type {
  MessagingProvider,
  OutboundMessage,
  ProviderResponse,
  HealthStatus,
  ProviderCapabilities,
  ProviderErrorKind,
} from '@bcp/contracts'

export interface MetaProviderConfig {
  phoneNumberId: string
  accessToken: string
  webhookVerifyToken: string
  apiVersion?: string
}

// ponytail: sin retries/backoff propio — el caller (queue/worker) ya decide
// qué hacer con ProviderError según su `kind`. Agregar retry acá si un sprint
// futuro lo pide explícito.
export class MetaProvider implements MessagingProvider {
  readonly providerId = 'meta'
  private readonly apiVersion: string

  constructor(private readonly config: MetaProviderConfig) {
    this.apiVersion = config.apiVersion ?? 'v18.0'
  }

  // ponytail: `credentials` (por ChannelConnection) pisa la config del constructor cuando
  // viene informado — permite validar/usar lo que el usuario cargó en POST /channels/connect
  // en vez de siempre pegarle a la cuenta fija de env vars.
  private resolveConfig(credentials?: unknown): MetaProviderConfig {
    if (!credentials || typeof credentials !== 'object') return this.config
    const c = credentials as Partial<MetaProviderConfig>
    if (!c.phoneNumberId || !c.accessToken) return this.config
    return { ...this.config, ...c }
  }

  private phoneUrl(config: MetaProviderConfig): string {
    return `https://graph.facebook.com/${config.apiVersion ?? this.apiVersion}/${config.phoneNumberId}`
  }

  async connect(credentials?: unknown): Promise<void> {
    const config = this.resolveConfig(credentials)
    const res = await fetch(`${this.phoneUrl(config)}?access_token=${config.accessToken}`)
    if (!res.ok) {
      throw new ProviderError('AuthError', `Meta auth check failed: ${res.status} ${res.statusText}`)
    }
  }

  async send(message: OutboundMessage, credentials?: unknown): Promise<ProviderResponse> {
    const config = this.resolveConfig(credentials)
    const body = this.buildBody(message)
    const res = await fetch(`${this.phoneUrl(config)}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    type MetaSendResponse = { error?: { message?: string }; messages?: { id: string }[] }
    const json = (await res.json().catch(() => undefined)) as MetaSendResponse | undefined

    if (!res.ok) {
      const errorMessage = json?.error?.message ?? res.statusText
      throw new ProviderError(this.errorKindForStatus(res.status), errorMessage)
    }

    return {
      providerMessageId: json?.messages?.[0]?.id ?? '',
      timestamp: new Date(),
      raw: json,
    }
  }

  async health(credentials?: unknown): Promise<HealthStatus> {
    const config = this.resolveConfig(credentials)
    const start = Date.now()
    try {
      const res = await fetch(`${this.phoneUrl(config)}?access_token=${config.accessToken}`)
      const latencyMs = Date.now() - start
      return { status: res.ok ? 'online' : 'degraded', latencyMs }
    } catch (err) {
      return { status: 'offline', latencyMs: Date.now() - start, details: (err as Error).message }
    }
  }

  capabilities(): ProviderCapabilities {
    return { supportsTemplates: true, supportsMedia: true, supportsButtons: true, maxMessagesPerMinute: 100 }
  }

  private errorKindForStatus(status: number): ProviderErrorKind {
    if (status === 429) return 'RateLimitError'
    if (status === 401) return 'AuthError'
    if (status >= 500) return 'TemporaryError'
    return 'PermanentError'
  }

  private buildBody(message: OutboundMessage): Record<string, unknown> {
    if (message.templateName) {
      const components = message.templateVariables
        ? [
            {
              type: 'body',
              parameters: Object.values(message.templateVariables).map((text) => ({ type: 'text', text })),
            },
          ]
        : []
      return {
        messaging_product: 'whatsapp',
        to: message.to,
        type: 'template',
        template: {
          name: message.templateName,
          language: { code: message.templateLanguage ?? 'es' },
          components,
        },
      }
    }

    if (message.mediaUrl) {
      // ponytail: siempre 'image' — el contrato no distingue tipos de media, YAGNI.
      // Agregar 'document'/'video' si un sprint futuro lo pide explícito.
      return {
        messaging_product: 'whatsapp',
        to: message.to,
        type: 'image',
        image: { link: message.mediaUrl, caption: message.body },
      }
    }

    return {
      messaging_product: 'whatsapp',
      to: message.to,
      type: 'text',
      text: { body: message.body },
    }
  }
}
