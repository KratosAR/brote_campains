export interface CursorPaginationInput {
  cursor?: string
  limit: number
}

export interface CursorPaginationResult<T> {
  items: T[]
  nextCursor?: string
  hasMore: boolean
  limit: number
}

export class CursorEncoder {
  static encode(id: string, timestamp: Date): string {
    return Buffer.from(`${id}:${timestamp.getTime()}`).toString('base64')
  }

  static decode(cursor: string): { id: string; timestamp: Date } {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    const id = parts[0] ?? ''
    const timestampMs = parseInt(parts[1] ?? '0', 10)
    return {
      id,
      timestamp: new Date(timestampMs),
    }
  }
}
