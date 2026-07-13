import { Campaign, CampaignId, Result, DomainError } from '@bcp/domain'
import { ICampaignRepository } from '@bcp/contracts'

export interface DuplicateCampaignInput {
  campaignId: string
  workspaceId: string
  // ponytail: userId no persistido, Campaign no trackea createdBy todavía
  userId: string
}

export interface DuplicateCampaignOutput {
  campaignId: string
}

export class DuplicateCampaignCommand {
  constructor(private readonly campaignRepository: ICampaignRepository) {}

  async execute(input: DuplicateCampaignInput): Promise<Result<DuplicateCampaignOutput, DomainError>> {
    const found = await this.campaignRepository.findById(CampaignId.from(input.campaignId), input.workspaceId)
    if (found.isFail()) return Result.fail(found.getError())
    const original = found.getValue()

    // ponytail: sin schedule ni deliveryPolicy — el duplicado siempre nace en Draft con la
    // política default, tal como pide el spec ("sin agenda").
    const duplicateResult = Campaign.createDraft(
      original.workspaceId,
      `${original.name} (copy)`,
      original.channel,
      original.audience,
      original.templateId,
    )
    if (duplicateResult.isFail()) return Result.fail(duplicateResult.getError())
    const duplicate = duplicateResult.getValue()

    const saveResult = await this.campaignRepository.save(duplicate)
    if (saveResult.isFail()) return Result.fail(saveResult.getError())

    return Result.ok({ campaignId: duplicate.campaignId.toString() })
  }
}
