import { CampaignSchedule } from '../campaign/CampaignSchedule'
import { ValidationError } from '../shared/errors/DomainError'

describe('CampaignSchedule', () => {
  it('creates a schedule with a future sendAt', () => {
    const sendAt = new Date(Date.now() + 60_000)
    const result = CampaignSchedule.create({ sendAt, timezone: 'America/Argentina/Cordoba', sendNow: false })

    expect(result.isOk()).toBe(true)
  })

  it('rejects a past sendAt when sendNow is false', () => {
    const sendAt = new Date(Date.now() - 60_000)
    const result = CampaignSchedule.create({ sendAt, timezone: 'America/Argentina/Cordoba', sendNow: false })

    expect(result.isFail()).toBe(true)
    expect(result.getError()).toBeInstanceOf(ValidationError)
  })

  it('allows a past sendAt when sendNow is true', () => {
    const sendAt = new Date(Date.now() - 60_000)
    const result = CampaignSchedule.create({ sendAt, timezone: 'America/Argentina/Cordoba', sendNow: true })

    expect(result.isOk()).toBe(true)
  })
})
