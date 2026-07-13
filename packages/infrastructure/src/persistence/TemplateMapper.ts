import type {
  Prisma,
  Template as PrismaTemplate,
  TemplateVersion as PrismaTemplateVersion,
} from '@prisma/client'
import {
  Template,
  TemplateId,
  TemplateStatus,
  TemplateContent,
  TemplateVariable,
  TemplateVersion,
} from '@bcp/domain'
import type { ChannelType } from '@bcp/domain'

export type TemplateRecord = PrismaTemplate & {
  versions: PrismaTemplateVersion[]
}

// ponytail: variables persistidas como JSON plano ({ name, required, defaultValue }[]),
// sin schema Zod — el shape lo controla TemplateVariable.create de dominio.
interface PersistedVariable {
  name: string
  required: boolean
  defaultValue?: string
}

export const TemplateMapper = {
  toDomain(record: TemplateRecord): Template {
    const versions = record.versions
      .slice()
      .sort((a, b) => a.version - b.version)
      .map((v) => {
        const variables = (v.variables as unknown as PersistedVariable[]).map((variable) =>
          TemplateVariable.create(variable.name, variable.required, variable.defaultValue),
        )
        const content = TemplateContent.create(v.body, variables).getValue()
        return TemplateVersion.hydrate(v.version, content, v.createdAt, v.createdBy ?? undefined)
      })

    return Template.hydrate(
      {
        workspaceId: record.workspaceId,
        name: record.name,
        description: record.description ?? undefined,
        channel: record.channel as ChannelType,
        versions,
        activeVersion: record.activeVersion,
        status: record.status as TemplateStatus,
      },
      TemplateId.from(record.id),
      record.createdAt,
      record.updatedAt,
    )
  },

  toPersistence(template: Template): {
    template: Omit<PrismaTemplate, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }
    versions: (Omit<PrismaTemplateVersion, 'variables'> & { variables: Prisma.InputJsonValue })[]
  } {
    const id = template.templateId.toString()
    const workspaceId = template.workspaceId

    return {
      template: {
        id,
        workspaceId,
        name: template.name,
        description: template.description ?? null,
        channel: template.channel,
        activeVersion: template.activeVersion,
        status: template.status,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      },
      versions: template.versions.map((v) => ({
        id: `${id}:${v.version}`,
        templateId: id,
        workspaceId,
        version: v.version,
        body: v.content.body,
        variables: v.content.variables.map((variable) => ({
          name: variable.name,
          required: variable.required,
          defaultValue: variable.defaultValue,
        })) as Prisma.InputJsonValue,
        createdAt: v.createdAt,
        createdBy: v.createdBy ?? null,
      })),
    }
  },
}
