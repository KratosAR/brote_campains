import { Specification, AndSpecification } from '../../shared/Specification'
import { Campaign } from '../Campaign'

export class CampaignHasAudience implements Specification<Campaign> {
  isSatisfiedBy(campaign: Campaign): boolean {
    const estimatedCount = campaign.audience.estimatedCount
    if (estimatedCount === undefined) return true
    return estimatedCount > 0
  }
}

export class CampaignHasValidSchedule implements Specification<Campaign> {
  isSatisfiedBy(campaign: Campaign): boolean {
    const schedule = campaign.scheduleInfo
    if (!schedule) return true
    return schedule.sendAt.getTime() >= new Date().getTime()
  }
}

// ponytail: WorkspaceIsActive requiere el aggregate Workspace, que no está disponible dentro de Campaign
// — se verifica en el Application layer (casos de uso), no acá.
export class CampaignCanStart extends AndSpecification<Campaign> {
  constructor() {
    super(new CampaignHasAudience(), new CampaignHasValidSchedule())
  }
}
