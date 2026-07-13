import { SendDeliveryJobData as RetryDeliveryJobData, SendDeliveryDeps as RetryDeliveryDeps, sendDeliveryHandler } from './sendDelivery'

export type { RetryDeliveryJobData, RetryDeliveryDeps }

// ponytail: mismo flujo que send-delivery (spec lo dice explícito) — reusa el handler entero,
// attemptSend ya calcula el attemptNumber a partir de delivery.attempts.length.
export const retryDeliveryHandler = sendDeliveryHandler
