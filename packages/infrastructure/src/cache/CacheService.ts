import type { RedisCache } from './RedisCache'

export class CacheService {
  constructor(private cache: RedisCache) {}

  async getWorkspace(workspaceId: string) {
    return this.cache.get(`workspace:${workspaceId}`)
  }

  async setWorkspace(workspaceId: string, data: unknown) {
    return this.cache.set(`workspace:${workspaceId}`, data, 300) // 5 min TTL
  }

  async invalidateWorkspace(workspaceId: string) {
    return this.cache.delete(`workspace:${workspaceId}`)
  }

  async getUserPermissions(userId: string, workspaceId: string) {
    return this.cache.get(`permissions:${userId}:${workspaceId}`)
  }

  async setUserPermissions(userId: string, workspaceId: string, permissions: string[]) {
    return this.cache.set(`permissions:${userId}:${workspaceId}`, permissions, 300) // 5 min
  }

  async invalidateUserPermissions(userId: string, workspaceId: string) {
    return this.cache.delete(`permissions:${userId}:${workspaceId}`)
  }

  async getTemplate(templateId: string) {
    return this.cache.get(`template:${templateId}`)
  }

  async setTemplate(templateId: string, data: unknown) {
    return this.cache.set(`template:${templateId}`, data, 600) // 10 min TTL
  }

  async invalidateTemplate(templateId: string) {
    return this.cache.delete(`template:${templateId}`)
  }

  async invalidateWorkspaceTemplates(_workspaceId: string) {
    // ponytail: cache invalidation by pattern — for MVP, rely on TTL expiration
    // In production, use Redis SCAN + DEL with key pattern matching
  }
}
