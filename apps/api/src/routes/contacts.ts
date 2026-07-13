import { Router } from 'express'
import { z } from 'zod'
import { AwilixContainer } from 'awilix'

import {
  CreateContactCommand,
  UpdateContactCommand,
  ArchiveContactCommand,
  OptOutContactCommand,
  AddContactToGroupCommand,
  CreateGroupCommand,
  SearchContactsQuery,
  GetContactQuery,
  ImportContactsCommand,
  GetImportStatusQuery,
} from '@bcp/application'
import { Contact, ContactGroup, ChannelType, DomainError } from '@bcp/domain'

import { authenticate } from '../middleware/authenticate'
import { requireOwnWorkspace } from '../middleware/requireOwnWorkspace'
import { sendDomainError } from '../utils/httpError'
import { Cradle } from '../container'

const channelSchema = z.object({
  type: z.nativeEnum(ChannelType),
  value: z.string().min(1),
  verified: z.boolean().optional(),
  isPrimary: z.boolean().optional(),
})

const createContactSchema = z.object({
  identity: z.object({
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    company: z.string().optional(),
    externalId: z.string().optional(),
    notes: z.string().optional(),
  }),
  channels: z.array(channelSchema),
  tags: z.array(z.string()).optional(),
  groupIds: z.array(z.string()).optional(),
})

const updateContactSchema = z.object({
  identity: createContactSchema.shape.identity.optional(),
  channels: z
    .array(channelSchema.extend({ remove: z.boolean().optional() }))
    .optional(),
  tags: z.array(z.string()).optional(),
})

const createGroupSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
})

const importContactsSchema = z.object({
  fileKey: z.string().min(1),
  columnMapping: z.record(z.string()),
  options: z.object({ hasHeader: z.boolean().optional() }).optional(),
})

function contactToJson(contact: Contact) {
  return {
    id: contact.contactId.toString(),
    workspaceId: contact.workspaceId,
    identity: {
      firstName: contact.identity.firstName,
      lastName: contact.identity.lastName,
      company: contact.identity.company,
      externalId: contact.identity.externalId,
      notes: contact.identity.notes,
    },
    channels: contact.channels.map((c) => ({
      type: c.type,
      value: c.value,
      verified: c.verified,
      isPrimary: c.isPrimary,
    })),
    tags: contact.tags,
    status: contact.status,
    optedOut: contact.isOptedOut(),
  }
}

function groupToJson(group: ContactGroup) {
  return {
    id: group.groupId.toString(),
    workspaceId: group.workspaceId,
    name: group.name,
    description: group.description,
    contactCount: group.contactCount,
  }
}

export function createContactsRouter(container: AwilixContainer<Cradle>, jwtSecret: string): Router {
  const router = Router()

  // Same scoping pattern as workspaces.ts: enforce auth + workspace ownership
  // once for everything nested under :id, instead of per-handler.
  router.use('/workspaces/:id', authenticate(jwtSecret), requireOwnWorkspace)

  router.post('/workspaces/:id/contacts', async (req, res) => {
    const parsed = createContactSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new CreateContactCommand(
      container.resolve('contactRepository'),
      container.resolve('eventBus'),
    )
    const result = await command.execute({
      workspaceId: String(req.params.id),
      identity: parsed.data.identity,
      channels: parsed.data.channels,
      tags: parsed.data.tags,
      groupIds: parsed.data.groupIds,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  })

  router.get('/workspaces/:id/contacts', async (req, res) => {
    const query = new SearchContactsQuery(container.resolve('contactRepository'))
    const tags = req.query.tags
    const page = await query.execute({
      workspaceId: String(req.params.id),
      q: req.query.q ? String(req.query.q) : undefined,
      tags: tags ? (Array.isArray(tags) ? tags.map(String) : String(tags).split(',')) : undefined,
      groupId: req.query.groupId ? String(req.query.groupId) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      acceptsCampaigns: req.query.acceptsCampaigns ? String(req.query.acceptsCampaigns) : undefined,
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
    })
    res.status(200).json({
      success: true,
      data: page.items.map(contactToJson),
      meta: { total: page.total, page: page.page, limit: page.limit },
    })
  })

  router.get('/workspaces/:id/contacts/import/:jobId', async (req, res) => {
    const query = new GetImportStatusQuery(container.resolve('cache'))
    const result = await query.execute({
      jobId: String(req.params.jobId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true, data: result.getValue() })
  })

  router.get('/workspaces/:id/contacts/:contactId', async (req, res) => {
    const query = new GetContactQuery(container.resolve('contactRepository'))
    const result = await query.execute({
      contactId: String(req.params.contactId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true, data: contactToJson(result.getValue()) })
  })

  router.patch('/workspaces/:id/contacts/:contactId', async (req, res) => {
    const parsed = updateContactSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new UpdateContactCommand(
      container.resolve('contactRepository'),
      container.resolve('eventBus'),
    )
    const result = await command.execute({
      contactId: String(req.params.contactId),
      workspaceId: String(req.params.id),
      identity: parsed.data.identity,
      channels: parsed.data.channels,
      tags: parsed.data.tags,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError() as DomainError)
      return
    }
    res.status(200).json({ success: true })
  })

  router.delete('/workspaces/:id/contacts/:contactId', async (req, res) => {
    const command = new ArchiveContactCommand(
      container.resolve('contactRepository'),
      container.resolve('eventBus'),
    )
    const result = await command.execute({
      contactId: String(req.params.contactId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true })
  })

  router.post('/workspaces/:id/contacts/:contactId/opt-out', async (req, res) => {
    const command = new OptOutContactCommand(
      container.resolve('contactRepository'),
      container.resolve('eventBus'),
    )
    const result = await command.execute({
      contactId: String(req.params.contactId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true })
  })

  router.post('/workspaces/:id/contacts/import', async (req, res) => {
    const parsed = importContactsSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new ImportContactsCommand(container.resolve('queue'))
    const result = await command.execute({
      workspaceId: String(req.params.id),
      fileKey: parsed.data.fileKey,
      columnMapping: parsed.data.columnMapping,
      options: parsed.data.options,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(202).json({ success: true, data: result.getValue() })
  })

  router.post('/workspaces/:id/groups', async (req, res) => {
    const parsed = createGroupSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' })
      return
    }

    const command = new CreateGroupCommand(container.resolve('groupRepository'))
    const result = await command.execute({
      workspaceId: String(req.params.id),
      name: parsed.data.name,
      description: parsed.data.description,
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(201).json({ success: true, data: result.getValue() })
  })

  // ponytail: no dedicated "list groups" Query exists — the repo method is
  // enough for a flat list, add a Query only if this needs richer filtering.
  router.get('/workspaces/:id/groups', async (req, res) => {
    const groups = await container.resolve('groupRepository').findByWorkspace(String(req.params.id))
    res.status(200).json({ success: true, data: groups.map(groupToJson) })
  })

  router.post('/workspaces/:id/groups/:groupId/contacts/:contactId', async (req, res) => {
    const command = new AddContactToGroupCommand(container.resolve('groupRepository'))
    const result = await command.execute({
      contactId: String(req.params.contactId),
      groupId: String(req.params.groupId),
      workspaceId: String(req.params.id),
    })
    if (result.isFail()) {
      sendDomainError(res, result.getError())
      return
    }
    res.status(200).json({ success: true })
  })

  return router
}
