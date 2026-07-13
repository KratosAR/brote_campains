import { UniqueId } from '@bcp/domain'

export interface DeliveryBatch {
  batchId: string
  deliveryIds: string[]
  priority: number
  scheduledAfter: Date
}

// ponytail: 1 lote = 1 minuto de capacidad, ratePerMinute como tamaño de lote fijo.
// Sin prioridades múltiples todavía (YAGNI) — priority queda fijo en 1.
export function plan(deliveryIds: string[], ratePerMinute: number): DeliveryBatch[] {
  const now = new Date()
  const batches: DeliveryBatch[] = []

  for (let i = 0; i < deliveryIds.length; i += ratePerMinute) {
    const batchIndex = i / ratePerMinute
    batches.push({
      batchId: UniqueId.generate().toString(),
      deliveryIds: deliveryIds.slice(i, i + ratePerMinute),
      priority: 1,
      scheduledAfter: new Date(now.getTime() + batchIndex * 60_000),
    })
  }

  return batches
}
