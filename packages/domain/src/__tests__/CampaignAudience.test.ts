import { CampaignAudience } from '../campaign/CampaignAudience'
import { ValidationError } from '../shared/errors/DomainError'

describe('CampaignAudience', () => {
  it('creates an "all" audience without extra requirements', () => {
    const result = CampaignAudience.create({ type: 'all' })
    expect(result.isOk()).toBe(true)
  })

  it('creates a "segment" audience without extra requirements', () => {
    const result = CampaignAudience.create({ type: 'segment' })
    expect(result.isOk()).toBe(true)
  })

  it('requires groupIds for type "group"', () => {
    const result = CampaignAudience.create({ type: 'group' })
    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('accepts type "group" with groupIds', () => {
    const result = CampaignAudience.create({ type: 'group', groupIds: ['g1'] })
    expect(result.isOk()).toBe(true)
  })

  it('requires contactIds for type "manual"', () => {
    const result = CampaignAudience.create({ type: 'manual' })
    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('accepts type "manual" with contactIds', () => {
    const result = CampaignAudience.create({ type: 'manual', contactIds: ['c1'] })
    expect(result.isOk()).toBe(true)
  })
})
