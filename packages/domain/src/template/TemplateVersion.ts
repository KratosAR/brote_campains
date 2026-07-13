import { Entity } from '../shared/Entity'
import { TemplateContent } from './TemplateContent'

interface TemplateVersionProps {
  version: number
  content: TemplateContent
  createdAt: Date
  createdBy?: string
}

export class TemplateVersion extends Entity<TemplateVersionProps> {
  private constructor(props: TemplateVersionProps) {
    super(props)
  }

  static create(version: number, content: TemplateContent, createdBy?: string): TemplateVersion {
    return new TemplateVersion({ version, content, createdAt: new Date(), createdBy })
  }

  static hydrate(
    version: number,
    content: TemplateContent,
    createdAt: Date,
    createdBy?: string,
  ): TemplateVersion {
    return new TemplateVersion({ version, content, createdAt, createdBy })
  }

  get version(): number {
    return this.props.version
  }

  get content(): TemplateContent {
    return this.props.content
  }

  get createdAt(): Date {
    return this.props.createdAt
  }

  get createdBy(): string | undefined {
    return this.props.createdBy
  }
}
