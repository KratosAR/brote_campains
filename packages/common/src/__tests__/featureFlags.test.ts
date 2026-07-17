import { FeatureFlags, FeatureFlagSource } from '../featureFlags'

function sourceFrom(values: Record<string, string>): FeatureFlagSource {
  return { get: (name) => values[name] }
}

describe('FeatureFlags', () => {
  it('defaults every flag to disabled when unset', () => {
    const flags = new FeatureFlags(sourceFrom({}))

    expect(flags.isEnabled('email-channel')).toBe(false)
    expect(flags.isEnabled('beta-ui')).toBe(false)
    expect(flags.isEnabled('automations')).toBe(false)
  })

  it('enables a flag when its env var is "true"', () => {
    const flags = new FeatureFlags(sourceFrom({ FEATURE_EMAIL_CHANNEL: 'true' }))

    expect(flags.isEnabled('email-channel')).toBe(true)
  })

  it('enables a flag when its env var is "1"', () => {
    const flags = new FeatureFlags(sourceFrom({ FEATURE_BETA_UI: '1' }))

    expect(flags.isEnabled('beta-ui')).toBe(true)
  })

  it('treats any other value as disabled', () => {
    const flags = new FeatureFlags(sourceFrom({ FEATURE_AI_FEATURES: 'yes' }))

    expect(flags.isEnabled('ai-features')).toBe(false)
  })

  it('re-reads the source on every call, so a mutable source can flip without restarting the FeatureFlags instance', () => {
    const values: Record<string, string> = {}
    const flags = new FeatureFlags(sourceFrom(values))

    expect(flags.isEnabled('sms-channel')).toBe(false)
    values.FEATURE_SMS_CHANNEL = 'true'
    expect(flags.isEnabled('sms-channel')).toBe(true)
  })

  it('maps multi-word flags to SCREAMING_SNAKE_CASE env vars', () => {
    const flags = new FeatureFlags(sourceFrom({ FEATURE_TELEGRAM_CHANNEL: 'true' }))

    expect(flags.isEnabled('telegram-channel')).toBe(true)
  })
})
