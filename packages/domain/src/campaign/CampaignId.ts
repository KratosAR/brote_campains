import { UniqueId } from '../shared/UniqueId'

export class CampaignId extends UniqueId {
  static generate(): CampaignId {
    return new CampaignId(UniqueId.generate().toString())
  }

  static from(value: string): CampaignId {
    return new CampaignId(value)
  }
}
