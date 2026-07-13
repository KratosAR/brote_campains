import { Campaign } from '../campaign/Campaign'
import { CampaignAudience } from '../campaign/CampaignAudience'
import { CampaignSchedule } from '../campaign/CampaignSchedule'
import { ChannelType } from '../contact/ChannelType'
import {
  CampaignHasAudience,
  CampaignHasValidSchedule,
} from '../campaign/specifications/CampaignSpecifications'

function makeCampaign(audience: CampaignAudience): Campaign {
  return Campaign.createDraft('workspace-1', 'Promo', ChannelType.WhatsApp, audience, 'template-1').getValue()
}

describe('CampaignHasAudience', () => {
  it('is satisfied when estimatedCount is undefined', () => {
    const campaign = makeCampaign(CampaignAudience.create({ type: 'all' }).getValue())
    expect(new CampaignHasAudience().isSatisfiedBy(campaign)).toBe(true)
  })

  it('is satisfied when estimatedCount is greater than 0', () => {
    const campaign = makeCampaign(CampaignAudience.create({ type: 'all', estimatedCount: 10 }).getValue())
    expect(new CampaignHasAudience().isSatisfiedBy(campaign)).toBe(true)
  })

  it('is not satisfied when estimatedCount is 0', () => {
    const campaign = makeCampaign(CampaignAudience.create({ type: 'all', estimatedCount: 0 }).getValue())
    expect(new CampaignHasAudience().isSatisfiedBy(campaign)).toBe(false)
  })
})

describe('CampaignHasValidSchedule', () => {
  it('is satisfied when there is no schedule yet', () => {
    const campaign = makeCampaign(CampaignAudience.create({ type: 'all' }).getValue())
    expect(new CampaignHasValidSchedule().isSatisfiedBy(campaign)).toBe(true)
  })

  it('is satisfied when sendAt is not in the past', () => {
    const campaign = makeCampaign(CampaignAudience.create({ type: 'all' }).getValue())
    const schedule = CampaignSchedule.create({
      sendAt: new Date(Date.now() + 60_000),
      timezone: 'America/Argentina/Cordoba',
      sendNow: false,
    }).getValue()
    campaign.schedule(schedule)
    expect(new CampaignHasValidSchedule().isSatisfiedBy(campaign)).toBe(true)
  })
})
