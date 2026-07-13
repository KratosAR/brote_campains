import { Result, NotFoundError, Template, TemplateId } from '@bcp/domain'
import { ITemplateRepository, TemplateListFilters, Pagination, Page } from '@bcp/contracts'

export class InMemoryTemplateRepository implements ITemplateRepository {
  readonly templates = new Map<string, Template>()

  async findById(id: TemplateId, workspaceId: string): Promise<Result<Template, NotFoundError>> {
    const found = this.templates.get(id.toString())
    if (!found || found.workspaceId !== workspaceId) {
      return Result.fail(new NotFoundError('Template', id.toString()))
    }
    return Result.ok(found)
  }

  async list(
    workspaceId: string,
    filters: TemplateListFilters,
    pagination: Pagination,
  ): Promise<Page<Template>> {
    const items = [...this.templates.values()].filter(
      (t) =>
        t.workspaceId === workspaceId &&
        (filters.channel === undefined || t.channel === filters.channel) &&
        (filters.status === undefined || t.status === filters.status),
    )
    return { items, total: items.length, page: pagination.page, limit: pagination.limit }
  }

  async save(template: Template): Promise<Result<void, NotFoundError>> {
    this.templates.set(template.templateId.toString(), template)
    return Result.ok(undefined)
  }
}
