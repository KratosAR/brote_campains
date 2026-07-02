import { AsyncLocalStorage } from 'async_hooks'
import { ulid } from 'ulid'

interface RequestContextData {
  correlationId: string
  userId?: string
}

const storage = new AsyncLocalStorage<RequestContextData>()

export const RequestContext = {
  run<T>(data: RequestContextData, fn: () => T): T {
    return storage.run(data, fn)
  },

  getCorrelationId(): string {
    return storage.getStore()?.correlationId ?? ulid()
  },

  getUserId(): string | undefined {
    return storage.getStore()?.userId
  },

  init(correlationId?: string): RequestContextData {
    return { correlationId: correlationId ?? ulid() }
  },
}
