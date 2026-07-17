/**
 * Feature flags, decoupling "merged to main" from "turned on for users".
 *
 * v1 is a deployment-level killswitch backed by environment variables -
 * toggling one still requires a redeploy/restart, same as any other env var.
 * The FeatureFlagSource interface exists so a database-backed source (real
 * "flip it without redeploying", optionally per-workspace) can be swapped in
 * later without touching any call site: implement FeatureFlagSource against
 * WorkspaceSettings or a dedicated table, pass it to `new FeatureFlags(...)`
 * instead of the default process.env source.
 */

export type FeatureFlag =
  | 'email-channel'
  | 'sms-channel'
  | 'telegram-channel'
  | 'ai-features'
  | 'automations'
  | 'beta-ui'

const DEFAULTS: Record<FeatureFlag, boolean> = {
  'email-channel': false,
  'sms-channel': false,
  'telegram-channel': false,
  'ai-features': false,
  automations: false,
  'beta-ui': false,
}

export interface FeatureFlagSource {
  get(envVarName: string): string | undefined
}

const processEnvSource: FeatureFlagSource = {
  get: (name) => process.env[name],
}

function envVarName(flag: FeatureFlag): string {
  return `FEATURE_${flag.toUpperCase().replace(/-/g, '_')}`
}

export class FeatureFlags {
  constructor(private readonly source: FeatureFlagSource = processEnvSource) {}

  isEnabled(flag: FeatureFlag): boolean {
    const raw = this.source.get(envVarName(flag))
    if (raw === undefined) return DEFAULTS[flag]
    return raw === 'true' || raw === '1'
  }
}

/** Default instance, reading from process.env. Most call sites want this. */
export const featureFlags = new FeatureFlags()
