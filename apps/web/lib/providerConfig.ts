import type { ChannelType, ProviderName } from '@bcp/sdk'

export interface ProviderField {
  name: string
  label: string
  type: 'text' | 'password' | 'email' | 'number' | 'url' | 'tel'
  required: boolean
  help?: string
}

export interface ProviderConfig {
  name: string
  displayName: string
  description: string
  fields: ProviderField[]
}

type ProviderConfigMap = Record<ChannelType, Partial<Record<ProviderName, ProviderConfig>>>

export const PROVIDER_CONFIGS: ProviderConfigMap = {
  whatsapp: {
    meta: {
      name: 'meta',
      displayName: 'Meta Cloud API',
      description: 'Connect via Meta Business API',
      fields: [
        {
          name: 'phoneNumberId',
          label: 'Phone Number ID',
          type: 'text',
          required: true,
          help: 'Found in Meta Business Manager under WhatsApp Business Account'
        },
        {
          name: 'accessToken',
          label: 'Access Token',
          type: 'password',
          required: true,
          help: 'Your Meta app access token (keep secure)'
        },
        {
          name: 'businessAccountId',
          label: 'Business Account ID',
          type: 'text',
          required: false,
          help: 'Optional: for multi-business setup'
        }
      ]
    },
    evolution: {
      name: 'evolution',
      displayName: 'Evolution API (Baileys)',
      description: 'Connect via Evolution API',
      fields: [
        {
          name: 'evolutionUrl',
          label: 'Evolution API URL',
          type: 'url',
          required: true,
          help: 'Your Evolution API instance URL'
        },
        {
          name: 'evolutionApiKey',
          label: 'API Key',
          type: 'password',
          required: true,
          help: 'Your Evolution API key'
        },
        {
          name: 'instanceName',
          label: 'Instance Name',
          type: 'text',
          required: true,
          help: 'Unique identifier for this connection'
        }
      ]
    }
  },
  email: {
    smtp: {
      name: 'smtp',
      displayName: 'SMTP Server',
      description: 'Connect via SMTP',
      fields: [
        {
          name: 'smtpHost',
          label: 'SMTP Host',
          type: 'text',
          required: true,
          help: 'e.g., smtp.gmail.com'
        },
        {
          name: 'smtpPort',
          label: 'SMTP Port',
          type: 'number',
          required: true,
          help: '587 (TLS) or 465 (SSL)'
        },
        {
          name: 'smtpUsername',
          label: 'Username/Email',
          type: 'email',
          required: true
        },
        {
          name: 'smtpPassword',
          label: 'Password',
          type: 'password',
          required: true,
          help: 'Use app-specific password for Gmail'
        },
        {
          name: 'fromEmail',
          label: 'From Email Address',
          type: 'email',
          required: true,
          help: 'Email address campaigns will be sent from'
        }
      ]
    }
  },
  sms: {
    twilio: {
      name: 'twilio',
      displayName: 'Twilio',
      description: 'Connect via Twilio',
      fields: [
        {
          name: 'twilioAccountSid',
          label: 'Account SID',
          type: 'text',
          required: true,
          help: 'Found in Twilio Console'
        },
        {
          name: 'twilioAuthToken',
          label: 'Auth Token',
          type: 'password',
          required: true,
          help: 'Your Twilio auth token'
        },
        {
          name: 'twilioPhoneNumber',
          label: 'Phone Number',
          type: 'tel',
          required: true,
          help: 'Twilio phone number (e.g., +1234567890)'
        }
      ]
    }
  }
}

export function getProviderConfig(
  channel: ChannelType,
  provider: ProviderName
): ProviderConfig | undefined {
  const channelProviders = PROVIDER_CONFIGS[channel]
  if (!channelProviders) return undefined
  return channelProviders[provider]
}

export function getProvidersForChannel(
  channel: ChannelType
): ProviderConfig[] {
  const channelProviders = PROVIDER_CONFIGS[channel]
  if (!channelProviders) return []
  return Object.values(channelProviders)
}
