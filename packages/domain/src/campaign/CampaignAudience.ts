import { ValueObject } from '../shared/ValueObject'
import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'

export type CampaignAudienceType = 'all' | 'group' | 'segment' | 'manual'

// ponytail: segmentRules queda fuera — el spec lo marca "para Sprint futuro", agregar cuando exista esa necesidad.
interface CampaignAudienceProps {
  type: CampaignAudienceType
  groupIds?: string[]
  contactIds?: string[]
  estimatedCount?: number
}

export class CampaignAudience extends ValueObject<CampaignAudienceProps> {
  private constructor(props: CampaignAudienceProps) {
    super(props)
  }

  static create(props: CampaignAudienceProps): Result<CampaignAudience, ValidationError> {
    if (props.type === 'group' && (!props.groupIds || props.groupIds.length === 0)) {
      return Result.fail(new ValidationError('groupIds is required for audience type "group"', 'groupIds'))
    }

    if (props.type === 'manual' && (!props.contactIds || props.contactIds.length === 0)) {
      return Result.fail(new ValidationError('contactIds is required for audience type "manual"', 'contactIds'))
    }

    return Result.ok(new CampaignAudience(props))
  }

  get type(): CampaignAudienceType {
    return this.props.type
  }

  get groupIds(): string[] | undefined {
    return this.props.groupIds ? [...this.props.groupIds] : undefined
  }

  get contactIds(): string[] | undefined {
    return this.props.contactIds ? [...this.props.contactIds] : undefined
  }

  get estimatedCount(): number | undefined {
    return this.props.estimatedCount
  }
}
