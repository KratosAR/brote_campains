import type {
  Contact as PrismaContact,
  ContactChannel as PrismaContactChannel,
  ContactTag as PrismaContactTag,
} from '@prisma/client'
import {
  Contact,
  ContactId,
  ContactIdentity,
  ContactChannel,
  ContactPreferences,
  ContactStatus,
  ChannelType,
  AcceptsCampaigns,
} from '@bcp/domain'

export type ContactRecord = PrismaContact & {
  channels: PrismaContactChannel[]
  tags: PrismaContactTag[]
}

export const ContactMapper = {
  toDomain(record: ContactRecord): Contact {
    const identity = ContactIdentity.create({
      firstName: record.firstName,
      lastName: record.lastName ?? undefined,
      company: record.company ?? undefined,
      externalId: record.externalId ?? undefined,
      notes: record.notes ?? undefined,
    }).getValue()

    const channels = record.channels.map((c) =>
      ContactChannel.create(c.type as ChannelType, c.value, {
        verified: c.verified,
        isPrimary: c.isPrimary,
      }).getValue(),
    )

    const preferences = ContactPreferences.create({
      acceptsCampaigns: record.acceptsCampaigns as AcceptsCampaigns,
      consentSource: record.consentSource ?? undefined,
      consentDate: record.consentDate ?? undefined,
      optedOutAt: record.optedOutAt ?? undefined,
      preferredChannel: (record.preferredChannel as ChannelType) ?? undefined,
    })

    return Contact.hydrate(
      {
        workspaceId: record.workspaceId,
        identity,
        channels,
        preferences,
        tags: record.tags.map((t) => t.tag),
        status: record.status as ContactStatus,
      },
      ContactId.from(record.id),
      record.createdAt,
      record.updatedAt,
    )
  },

  toPersistence(contact: Contact): {
    contact: Omit<PrismaContact, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }
    channels: Omit<PrismaContactChannel, 'createdAt'>[]
    tags: Omit<PrismaContactTag, never>[]
  } {
    const id = contact.contactId.toString()
    const workspaceId = contact.workspaceId
    const preferences = contact.preferences

    return {
      contact: {
        id,
        workspaceId,
        firstName: contact.identity.firstName,
        lastName: contact.identity.lastName ?? null,
        company: contact.identity.company ?? null,
        externalId: contact.identity.externalId ?? null,
        notes: contact.identity.notes ?? null,
        status: contact.status,
        acceptsCampaigns: preferences.acceptsCampaigns,
        consentSource: preferences.consentSource ?? null,
        consentDate: preferences.consentDate ?? null,
        optedOutAt: preferences.optedOutAt ?? null,
        preferredChannel: preferences.preferredChannel ?? null,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt,
      },
      channels: contact.channels.map((c) => ({
        id: `${id}:${c.type}:${c.value}`,
        contactId: id,
        workspaceId,
        type: c.type,
        value: c.value,
        verified: c.verified,
        isPrimary: c.isPrimary,
      })),
      tags: contact.tags.map((tag) => ({ contactId: id, workspaceId, tag })),
    }
  },
}
