import { CampaignId, CampaignStatisticsProps } from '@bcp/domain'
import { ICampaignRepository } from '@bcp/contracts'

export interface UpdateStatisticsJobData {
  campaignId: string
  workspaceId: string
  delta: Partial<CampaignStatisticsProps>
}

export interface UpdateStatisticsDeps {
  campaignRepository: ICampaignRepository
}

// ponytail: no atómico a nivel DB (load-modify-save), aceptable para FakeProvider/dev; si hay
// envíos concurrentes reales, mover a un UPDATE incremental en SQL.
export async function updateStatisticsHandler(data: UpdateStatisticsJobData, deps: UpdateStatisticsDeps): Promise<void> {
  const { campaignId, workspaceId, delta } = data
  const { campaignRepository } = deps

  const campaignResult = await campaignRepository.findById(CampaignId.from(campaignId), workspaceId)
  if (campaignResult.isFail()) return
  const campaign = campaignResult.getValue()

  campaign.updateStatistics(delta)
  await campaignRepository.save(campaign)
}
