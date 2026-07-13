import { ValueObject } from '../shared/ValueObject'
import { Result } from '../shared/Result'
import { ValidationError } from '../shared/errors/DomainError'

interface CampaignScheduleProps {
  sendAt: Date
  timezone: string
  sendNow: boolean
}

export class CampaignSchedule extends ValueObject<CampaignScheduleProps> {
  private constructor(props: CampaignScheduleProps) {
    super(props)
  }

  // ponytail: sin Clock inyectado, compara contra `new Date()` directo — mismo patrón que el resto del dominio.
  static create(props: CampaignScheduleProps): Result<CampaignSchedule, ValidationError> {
    if (!props.sendNow && props.sendAt.getTime() < new Date().getTime()) {
      return Result.fail(new ValidationError('sendAt cannot be in the past', 'sendAt'))
    }

    return Result.ok(new CampaignSchedule(props))
  }

  get sendAt(): Date {
    return this.props.sendAt
  }

  get timezone(): string {
    return this.props.timezone
  }

  get sendNow(): boolean {
    return this.props.sendNow
  }
}
