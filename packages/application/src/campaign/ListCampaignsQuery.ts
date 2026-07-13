import { Campaign, CampaignStatus } from '@bcp/domain'
import { ICampaignRepository, Page } from '@bcp/contracts'

// ponytail: todos los valores del enum como lista cuando no viene `status` — ICampaignRepository
// solo expone findByStatus, no hay un findAll separado, esto cumple sin tocar el contrato.
const ALL_STATUSES = Object.values(CampaignStatus)

export interface ListCampaignsInput {
  workspaceId: string
  status?: CampaignStatus
  page: number
  limit: number
}

export class ListCampaignsQuery {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  async execute(input: ListCampaignsInput): Promise<Page<Campaign>> {
    const statuses = input.status ? [input.status] : ALL_STATUSES
    return this.campaignRepository.findByStatus(input.workspaceId, statuses, {
      page: input.page,
      limit: input.limit,
    })
  }
}
