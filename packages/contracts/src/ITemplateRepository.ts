import { Result, Template, TemplateId, NotFoundError } from '@bcp/domain'
import { Pagination, Page } from './IContactRepository'

export interface TemplateListFilters {
  channel?: string
  status?: string
}

export interface ITemplateRepository {
  findById(id: TemplateId, workspaceId: string): Promise<Result<Template, NotFoundError>>
  list(workspaceId: string, filters: TemplateListFilters, pagination: Pagination): Promise<Page<Template>>
  save(template: Template): Promise<Result<void, NotFoundError>>
}
