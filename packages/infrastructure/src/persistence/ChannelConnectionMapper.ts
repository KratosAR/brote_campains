import { Prisma } from '@prisma/client'
import type { ChannelConnection as PrismaChannelConnection } from '@prisma/client'
import { ChannelConnection, ChannelConnectionId, ChannelType, ConnectionStatus } from '@bcp/domain'

// ponytail: el mapper solo convierte credentials (unknown) <-> string ya descifrado/a cifrar.
// Cifrar/descifrar es responsabilidad del repo, que tiene CredentialEncryption.
export const ChannelConnectionMapper = {
  toDomain(record: PrismaChannelConnection, decryptedCredentials: string): ChannelConnection {
    return ChannelConnection.hydrate(
      {
        workspaceId: record.workspaceId,
        channel: record.channel as ChannelType,
        providerId: record.providerId,
        status: record.status as ConnectionStatus,
        priority: record.priority,
        enabled: record.enabled,
        credentials: JSON.parse(decryptedCredentials),
        capabilities: (record.capabilities as Record<string, unknown> | null) ?? undefined,
        lastHealthCheck: record.lastHealthCheck ?? undefined,
      },
      ChannelConnectionId.from(record.id),
      record.createdAt,
      record.updatedAt,
    )
  },

  toPersistence(
    connection: ChannelConnection,
    encryptedCredentials: string,
  ): Omit<PrismaChannelConnection, 'createdAt' | 'updatedAt' | 'capabilities'> & {
    createdAt: Date
    updatedAt: Date
    capabilities: Prisma.InputJsonValue | typeof Prisma.JsonNull
  } {
    return {
      id: connection.connectionId.toString(),
      workspaceId: connection.workspaceId,
      channel: connection.channel,
      providerId: connection.providerId,
      status: connection.status,
      priority: connection.priority,
      enabled: connection.enabled,
      credentialsEncrypted: encryptedCredentials,
      capabilities: (connection.capabilities as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      lastHealthCheck: connection.lastHealthCheck ?? null,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    }
  },
}
