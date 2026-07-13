import { ValueObject } from '../shared/ValueObject'
import { ChannelType } from './ChannelType'

export type AcceptsCampaigns = 'yes' | 'no' | 'unknown'

interface ContactPreferencesProps {
  acceptsCampaigns: AcceptsCampaigns
  consentSource?: string
  consentDate?: Date
  optedOutAt?: Date
  preferredChannel?: ChannelType
}

export class ContactPreferences extends ValueObject<ContactPreferencesProps> {
  private constructor(props: ContactPreferencesProps) {
    super(props)
  }

  static create(props: Partial<ContactPreferencesProps> = {}): ContactPreferences {
    return new ContactPreferences({
      acceptsCampaigns: props.acceptsCampaigns ?? 'unknown',
      consentSource: props.consentSource,
      consentDate: props.consentDate,
      optedOutAt: props.optedOutAt,
      preferredChannel: props.preferredChannel,
    })
  }

  get acceptsCampaigns(): AcceptsCampaigns {
    return this.props.acceptsCampaigns
  }

  get consentSource(): string | undefined {
    return this.props.consentSource
  }

  get consentDate(): Date | undefined {
    return this.props.consentDate
  }

  get optedOutAt(): Date | undefined {
    return this.props.optedOutAt
  }

  get preferredChannel(): ChannelType | undefined {
    return this.props.preferredChannel
  }

  withOptOut(optedOutAt: Date): ContactPreferences {
    return new ContactPreferences({
      ...this.props,
      acceptsCampaigns: 'no',
      optedOutAt,
    })
  }

  withOptIn(): ContactPreferences {
    return new ContactPreferences({
      ...this.props,
      acceptsCampaigns: 'yes',
      optedOutAt: undefined,
    })
  }
}
