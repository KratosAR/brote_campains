import type { PrismaClient } from '@prisma/client'
import { Result, ChannelConnection, ChannelConnectionId, ChannelType, NotFoundError } from '@bcp/domain'
import type { IChannelConnectionRepository } from '@bcp/contracts'

import { ChannelConnectionMapper } from './ChannelConnectionMapper'
import { CredentialEncryption } from '../security/CredentialEncryption'

export class PrismaChannelConnectionRepository implements IChannelConnectionRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly credentialEncryption: CredentialEncryption,
  ) {}

  async findById(id: ChannelConnectionId, workspaceId: string): Promise<Result<ChannelConnection, NotFoundError>> {
    const record = await this.prisma.channelConnection.findFirst({ where: { id: id.toString(), workspaceId } })
    if (!record) return Result.fail(new NotFoundError('ChannelConnection', id.toString()))
    const decrypted = this.credentialEncryption.decrypt(record.credentialsEncrypted)
    return Result.ok(ChannelConnectionMapper.toDomain(record, decrypted))
  }

  async findByWorkspace(workspaceId: string): Promise<ChannelConnection[]> {
    const records = await this.prisma.channelConnection.findMany({ where: { workspaceId } })
    return records.map((r) => ChannelConnectionMapper.toDomain(r, this.credentialEncryption.decrypt(r.credentialsEncrypted)))
  }

  async findByChannel(workspaceId: string, channel: ChannelType): Promise<ChannelConnection[]> {
    const records = await this.prisma.channelConnection.findMany({ where: { workspaceId, channel } })
    return records.map((r) => ChannelConnectionMapper.toDomain(r, this.credentialEncryption.decrypt(r.credentialsEncrypted)))
  }

  async save(connection: ChannelConnection): Promise<Result<void, NotFoundError>> {
    const encrypted = this.credentialEncryption.encrypt(JSON.stringify(connection.credentials))
    const data = ChannelConnectionMapper.toPersistence(connection, encrypted)
    await this.prisma.channelConnection.upsert({ where: { id: data.id }, create: data, update: data })
    return Result.ok(undefined)
  }
}
