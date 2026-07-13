import { IDeliveryRepository, IQueue, ILogger } from '@bcp/contracts'

export interface ProcessWebhookJobData {
  provider: 'meta' | 'evolution'
  payload: unknown
}

export interface ProcessWebhookDeps {
  deliveryRepository: IDeliveryRepository
  queue: IQueue
  logger: ILogger
}

interface NormalizedWebhookEvent {
  providerMessageId: string
  status: 'delivered' | 'read' | 'failed'
  errorCode?: string
  errorMessage?: string
}

const META_STATUS_MAP: Record<string, NormalizedWebhookEvent['status'] | undefined> = {
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
}

// ponytail: shapes tipados como unknown-narrowed a mano — no hay schema oficial estable
// para webhooks de Meta/Evolution, así que se navega defensivamente y se retorna null
// ante cualquier forma inesperada en vez de asumir o explotar.
function normalizeMetaEvent(payload: unknown): NormalizedWebhookEvent | null {
  const p = payload as {
    entry?: Array<{ changes?: Array<{ value?: { statuses?: Array<Record<string, unknown>> } }> }>
  }
  const status = p?.entry?.[0]?.changes?.[0]?.value?.statuses?.[0] as
    | { id?: string; status?: string; errors?: Array<{ code?: string; title?: string }> }
    | undefined
  if (!status?.id || !status.status) return null

  const mapped = META_STATUS_MAP[status.status]
  if (!mapped) return null

  const firstError = status.errors?.[0]
  return {
    providerMessageId: status.id,
    status: mapped,
    errorCode: firstError?.code,
    errorMessage: firstError?.title,
  }
}

function normalizeEvolutionEvent(payload: unknown): NormalizedWebhookEvent | null {
  const p = payload as {
    event?: string
    data?: { key?: { id?: string }; update?: { status?: string } }
  }
  const id = p?.data?.key?.id
  const status = p?.data?.update?.status
  if (!id || !status) return null

  const normalized = status.toLowerCase()
  if (normalized === 'delivered' || normalized === 'read') return { providerMessageId: id, status: normalized }
  if (normalized === 'failed' || normalized === 'error') return { providerMessageId: id, status: 'failed' }
  return null
}

export function normalizeWebhookEvent(provider: 'meta' | 'evolution', payload: unknown): NormalizedWebhookEvent | null {
  if (provider === 'meta') return normalizeMetaEvent(payload)
  return normalizeEvolutionEvent(payload)
}

export async function processWebhookHandler(data: ProcessWebhookJobData, deps: ProcessWebhookDeps): Promise<void> {
  const { deliveryRepository, queue, logger } = deps
  const event = normalizeWebhookEvent(data.provider, data.payload)
  if (!event) {
    logger.warn('process-webhook: no se pudo normalizar el evento', { provider: data.provider })
    return
  }

  const delivery = await deliveryRepository.findByProviderMessageId(event.providerMessageId)
  if (!delivery) {
    logger.warn('process-webhook: delivery no encontrado para providerMessageId', {
      providerMessageId: event.providerMessageId,
    })
    return
  }

  const result =
    event.status === 'delivered'
      ? delivery.markDelivered()
      : event.status === 'read'
        ? delivery.markRead()
        : delivery.markFailed({ errorCode: event.errorCode, errorMessage: event.errorMessage })

  if (result.isFail()) {
    logger.debug('process-webhook: transición de estado ignorada (idempotencia)', {
      providerMessageId: event.providerMessageId,
      status: event.status,
      reason: result.getError().message,
    })
    return
  }

  await deliveryRepository.save(delivery)
  await queue.add('update-statistics', {
    campaignId: delivery.campaignId,
    workspaceId: delivery.workspaceId,
    delta: { [event.status]: 1 },
  })
}
