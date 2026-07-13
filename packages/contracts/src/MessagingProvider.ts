export interface OutboundMessage {
  to: string
  body: string
  mediaUrl?: string
  buttons?: string[]
  header?: string
  footer?: string
  templateName?: string
  templateLanguage?: string
  templateVariables?: Record<string, string>
}

export interface ProviderResponse {
  providerMessageId: string
  timestamp: Date
  raw?: unknown
}

export type ProviderErrorKind = 'PermanentError' | 'TemporaryError' | 'RateLimitError' | 'AuthError' | 'NetworkError'

export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
  ) {
    super(message)
  }
}

export interface HealthStatus {
  status: 'online' | 'degraded' | 'offline'
  latencyMs: number
  details?: string
}

export interface ProviderCapabilities {
  supportsTemplates: boolean
  supportsMedia: boolean
  supportsButtons: boolean
  maxMessagesPerMinute: number
}

export interface MessagingProvider {
  readonly providerId: string
  // `credentials` es la config por-conexión (ChannelConnection.credentials, ya descifrada).
  // Si no se pasa, el provider cae en la config con la que fue construido — mantiene
  // compatibilidad con FakeProvider y con callers que aún no resuelven por workspace.
  send(message: OutboundMessage, credentials?: unknown): Promise<ProviderResponse>
  health(credentials?: unknown): Promise<HealthStatus>
  capabilities(): ProviderCapabilities
  // ponytail: connect() opcional — FakeProvider (Sprint 6) no necesita validar nada externo
  // al arrancar. Meta/Evolution (Sprint 7) sí lo implementan y usan `credentials` para
  // validar lo que el usuario mandó en vez de la config estática de env vars.
  connect?(credentials?: unknown): Promise<void>
}
