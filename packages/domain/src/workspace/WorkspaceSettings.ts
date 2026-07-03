import { ValueObject } from '../shared/ValueObject'
import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'

interface WorkspaceSettingsProps {
  timezone: string
  locale: string
  maxContacts: number
  maxCampaigns: number
}

export class WorkspaceSettings extends ValueObject<WorkspaceSettingsProps> {
  private constructor(props: WorkspaceSettingsProps) {
    super(props)
  }

  static create(props: WorkspaceSettingsProps): Result<WorkspaceSettings, ValidationError> {
    if (!props.timezone || props.timezone.trim().length === 0) {
      return Result.fail(new ValidationError('Timezone cannot be empty', 'timezone'))
    }
    if (!props.locale || props.locale.trim().length === 0) {
      return Result.fail(new ValidationError('Locale cannot be empty', 'locale'))
    }
    if (props.maxContacts < 0) {
      return Result.fail(new ValidationError('maxContacts cannot be negative', 'maxContacts'))
    }
    if (props.maxCampaigns < 0) {
      return Result.fail(new ValidationError('maxCampaigns cannot be negative', 'maxCampaigns'))
    }

    return Result.ok(new WorkspaceSettings({ ...props }))
  }

  get timezone(): string {
    return this.props.timezone
  }

  get locale(): string {
    return this.props.locale
  }

  get maxContacts(): number {
    return this.props.maxContacts
  }

  get maxCampaigns(): number {
    return this.props.maxCampaigns
  }
}
