import { Result, NotFoundError } from '@bcp/domain'
import type { MessagingProvider } from '@bcp/contracts'

export class ProviderRegistry {
  private readonly providers = new Map<string, MessagingProvider>()

  register(provider: MessagingProvider): void {
    this.providers.set(provider.providerId, provider)
  }

  // ponytail: MessagingProvider no expone channel, así que get() indexa solo por providerId —
  // el channel lo valida quien llama (ChannelConnection ya sabe su channel).
  get(providerId: string): Result<MessagingProvider, NotFoundError> {
    const provider = this.providers.get(providerId)
    if (!provider) return Result.fail(new NotFoundError('MessagingProvider', providerId))
    return Result.ok(provider)
  }

  list(): MessagingProvider[] {
    return Array.from(this.providers.values())
  }

  // ponytail: no hay supports(channel, feature) — no existe un contrato de ProviderFeature
  // todavía. Se agrega cuando haya un caso de uso concreto (YAGNI).
}
