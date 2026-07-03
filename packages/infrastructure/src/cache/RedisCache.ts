import Redis from 'ioredis'

import { ICache } from '@bcp/contracts'

export class RedisCache implements ICache {
  constructor(private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key)
    return value ? (JSON.parse(value) as T) : null
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value)
    if (ttlSeconds) {
      await this.client.set(key, serialized, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, serialized)
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key)
  }
}
