import type { PrismaClient } from '@prisma/client'
import type { ILogger } from '@bcp/contracts'
import { UniqueId } from '@bcp/domain'

export interface AuditLogEntry {
  userId?: string
  workspaceId?: string
  event: string
  payload?: Record<string, unknown>
  ip?: string
  userAgent?: string
  correlationId?: string
}

export class AuditLogger {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: ILogger,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.prisma.auditLog.create({
        data: {
          id: UniqueId.generate().toString(),
          userId: entry.userId,
          workspaceId: entry.workspaceId,
          event: entry.event,
          payload: entry.payload as any,
          ip: entry.ip,
          userAgent: entry.userAgent,
          correlationId: entry.correlationId,
        },
      })

      this.logger.info('Audit log recorded', {
        userId: entry.userId,
        event: entry.event,
        workspaceId: entry.workspaceId,
      })
    } catch (error) {
      this.logger.error('Failed to record audit log', error, {
        userId: entry.userId,
        event: entry.event,
      })
    }
  }

  async getWorkspaceAuditLog(
    workspaceId: string,
    limit: number = 100,
    offset: number = 0,
  ): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return logs.map((log) => ({
      userId: log.userId ?? undefined,
      workspaceId: log.workspaceId ?? undefined,
      event: log.event,
      payload: (log.payload as Record<string, unknown>) ?? undefined,
      ip: log.ip ?? undefined,
      userAgent: log.userAgent ?? undefined,
      correlationId: log.correlationId ?? undefined,
    }))
  }

  async getUserAuditLog(
    userId: string,
    workspaceId: string,
    limit: number = 50,
  ): Promise<AuditLogEntry[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: { userId, workspaceId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return logs.map((log) => ({
      userId: log.userId ?? undefined,
      workspaceId: log.workspaceId ?? undefined,
      event: log.event,
      payload: (log.payload as Record<string, unknown>) ?? undefined,
      ip: log.ip ?? undefined,
      userAgent: log.userAgent ?? undefined,
      correlationId: log.correlationId ?? undefined,
    }))
  }
}
