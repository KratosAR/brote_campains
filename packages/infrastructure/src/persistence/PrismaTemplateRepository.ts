import type { PrismaClient, Prisma } from '@prisma/client'
import { Result, Template, TemplateId, NotFoundError } from '@bcp/domain'
import type {
  ITemplateRepository,
  TemplateListFilters,
  Pagination,
  Page,
} from '@bcp/contracts'

import { TemplateMapper } from './TemplateMapper'

const include = { versions: true } as const

export class PrismaTemplateRepository implements ITemplateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: TemplateId, workspaceId: string): Promise<Result<Template, NotFoundError>> {
    const record = await this.prisma.template.findFirst({
      where: { id: id.toString(), workspaceId },
      include,
    })
    if (!record) return Result.fail(new NotFoundError('Template', id.toString()))
    return Result.ok(TemplateMapper.toDomain(record))
  }

  async list(
    workspaceId: string,
    filters: TemplateListFilters,
    pagination: Pagination,
  ): Promise<Page<Template>> {
    const where: Prisma.TemplateWhereInput = { workspaceId }
    if (filters.channel) where.channel = filters.channel
    if (filters.status) where.status = filters.status

    const skip = (pagination.page - 1) * pagination.limit

    const [records, total] = await Promise.all([
      this.prisma.template.findMany({ where, include, skip, take: pagination.limit }),
      this.prisma.template.count({ where }),
    ])

    return {
      items: records.map((r) => TemplateMapper.toDomain(r)),
      total,
      page: pagination.page,
      limit: pagination.limit,
    }
  }

  // ponytail: las versiones nunca se mutan una vez creadas, así que un upsert idempotente por
  // (templateId, version) alcanza — no hace falta diffing contra lo ya persistido.
  async save(template: Template): Promise<Result<void, NotFoundError>> {
    const { template: data, versions } = TemplateMapper.toPersistence(template)

    await this.prisma.$transaction([
      this.prisma.template.upsert({ where: { id: data.id }, create: data, update: data }),
      ...versions.map((v) =>
        this.prisma.templateVersion.upsert({
          where: { templateId_version: { templateId: v.templateId, version: v.version } },
          create: v,
          update: v,
        }),
      ),
    ])

    return Result.ok(undefined)
  }
}
