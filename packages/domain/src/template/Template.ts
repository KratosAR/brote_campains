import { AggregateRoot } from '../shared/AggregateRoot'
import { Result } from '../shared/Result'
import { BusinessRuleViolationError, NotFoundError, ValidationError } from '../shared/errors/DomainError'
import { ChannelType } from '../contact/ChannelType'
import { TemplateId } from './TemplateId'
import { TemplateStatus } from './TemplateStatus'
import { TemplateContent } from './TemplateContent'
import { TemplateVersion } from './TemplateVersion'

interface TemplateProps {
  workspaceId: string
  name: string
  description?: string
  channel: ChannelType
  versions: TemplateVersion[]
  activeVersion: number
  status: TemplateStatus
}

export class Template extends AggregateRoot<TemplateProps> {
  private constructor(props: TemplateProps, id?: TemplateId, createdAt?: Date) {
    super(props, id, createdAt)
  }

  static create(
    workspaceId: string,
    name: string,
    channel: ChannelType,
    content: TemplateContent,
    createdBy?: string,
    description?: string,
  ): Result<Template, ValidationError> {
    if (!name || name.trim().length === 0) {
      return Result.fail(new ValidationError('Template name cannot be empty', 'name'))
    }

    const firstVersion = TemplateVersion.create(1, content, createdBy)

    return Result.ok(
      new Template({
        workspaceId,
        name,
        description,
        channel,
        versions: [firstVersion],
        activeVersion: 1,
        status: TemplateStatus.Active,
      }),
    )
  }

  static hydrate(
    props: TemplateProps,
    id: TemplateId,
    createdAt: Date,
    updatedAt: Date,
  ): Template {
    const template = new Template(props, id, createdAt)
    template.updatedAt = updatedAt
    return template
  }

  get templateId(): TemplateId {
    return this._id as TemplateId
  }

  get workspaceId(): string {
    return this.props.workspaceId
  }

  get name(): string {
    return this.props.name
  }

  get description(): string | undefined {
    return this.props.description
  }

  get channel(): ChannelType {
    return this.props.channel
  }

  get versions(): TemplateVersion[] {
    return [...this.props.versions]
  }

  get activeVersion(): number {
    return this.props.activeVersion
  }

  get status(): TemplateStatus {
    return this.props.status
  }

  createVersion(content: TemplateContent, createdBy?: string): Result<TemplateVersion, BusinessRuleViolationError> {
    const nextVersion = TemplateVersion.create(this.props.versions.length + 1, content, createdBy)
    this.props = { ...this.props, versions: [...this.props.versions, nextVersion] }
    return Result.ok(nextVersion)
  }

  activateVersion(version: number): Result<void, NotFoundError> {
    const exists = this.props.versions.some((v) => v.version === version)
    if (!exists) {
      return Result.fail(new NotFoundError('TemplateVersion', version.toString()))
    }

    this.props = { ...this.props, activeVersion: version }
    return Result.ok(undefined)
  }

  archive(): Result<void, BusinessRuleViolationError> {
    if (this.props.status === TemplateStatus.Archived) {
      return Result.fail(
        new BusinessRuleViolationError('Template is already archived', 'template.archive.alreadyArchived'),
      )
    }

    this.props = { ...this.props, status: TemplateStatus.Archived }
    return Result.ok(undefined)
  }

  getActiveContent(): TemplateContent {
    const active = this.props.versions.find((v) => v.version === this.props.activeVersion)
    // ponytail: activeVersion siempre apunta a una versión existente (invariante mantenida por
    // create/activateVersion), así que el "not found" acá sería un bug interno, no un caso de negocio.
    if (!active) throw new Error(`Active version ${this.props.activeVersion} not found`)
    return active.content
  }
}
