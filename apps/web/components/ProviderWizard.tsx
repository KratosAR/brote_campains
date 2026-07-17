'use client'

import React from 'react'
import { useMutation } from '@tanstack/react-query'
import { testConnection, connectChannel, type ChannelType, type ProviderName } from '@bcp/sdk'
import { useToast } from '@/lib/toast'
import { PROVIDER_CONFIGS, getProvidersForChannel } from '@/lib/providerConfig'
import { Card } from '@/components/ui/Card'

interface ProviderWizardProps {
  workspaceId: string
  onSuccess: () => void
}

type WizardStep = 'channel' | 'provider' | 'credentials' | 'test' | 'confirm'

interface CredentialValues {
  [key: string]: string
}

export function ProviderWizard({ workspaceId, onSuccess }: ProviderWizardProps) {
  const { addToast } = useToast()
  const [step, setStep] = React.useState<WizardStep>('channel')
  const [selectedChannel, setSelectedChannel] = React.useState<ChannelType | null>(null)
  const [selectedProvider, setSelectedProvider] = React.useState<ProviderName | null>(null)
  const [credentials, setCredentials] = React.useState<CredentialValues>({})
  const [testResult, setTestResult] = React.useState<{ status: string; message: string } | null>(null)
  const [credentialErrors, setCredentialErrors] = React.useState<Record<string, string>>({})

  const testMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChannel || !selectedProvider) {
        throw new Error('Missing channel or provider')
      }
      return testConnection(workspaceId, {
        channel: selectedChannel,
        provider: selectedProvider,
        credentials
      })
    },
    onSuccess: (data) => {
      setTestResult(data)
      addToast('Connection test successful!', 'success')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Connection test failed'
      setTestResult({ status: 'error', message })
      addToast(`Test failed: ${message}`, 'error')
    }
  })

  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!selectedChannel || !selectedProvider) {
        throw new Error('Missing channel or provider')
      }
      return connectChannel(workspaceId, {
        channel: selectedChannel,
        provider: selectedProvider,
        credentials
      })
    },
    onSuccess: () => {
      addToast('Provider connected successfully!', 'success')
      onSuccess()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Connection failed'
      addToast(`Connection failed: ${message}`, 'error')
    }
  })

  const handleSelectChannel = (channel: ChannelType) => {
    setSelectedChannel(channel)
    setSelectedProvider(null)
    setCredentials({})
    setStep('provider')
  }

  const handleSelectProvider = (provider: ProviderName) => {
    setSelectedProvider(provider)
    setCredentials({})
    setStep('credentials')
  }

  const handleCredentialChange = (field: string, value: string) => {
    setCredentials({ ...credentials, [field]: value })
    if (credentialErrors[field]) {
      setCredentialErrors({ ...credentialErrors, [field]: '' })
    }
  }

  const validateCredentials = (): boolean => {
    if (!selectedChannel || !selectedProvider) return false

    const config = PROVIDER_CONFIGS[selectedChannel]?.[selectedProvider]
    if (!config) return false

    const errors: Record<string, string> = {}
    for (const field of config.fields) {
      if (field.required && !credentials[field.name]) {
        errors[field.name] = `${field.label} is required`
      }
    }

    setCredentialErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleTestConnection = () => {
    if (validateCredentials()) {
      testMutation.mutate()
    }
  }

  const handleConfirm = () => {
    connectMutation.mutate()
  }

  const handleBack = () => {
    if (step === 'provider') {
      setSelectedChannel(null)
      setSelectedProvider(null)
      setStep('channel')
    } else if (step === 'credentials') {
      setSelectedProvider(null)
      setCredentials({})
      setStep('provider')
    } else if (step === 'test') {
      setStep('credentials')
    } else if (step === 'confirm') {
      setTestResult(null)
      setStep('test')
    }
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Channel Selection */}
      {step === 'channel' && (
        <Card>
          <h2 className="text-lg font-semibold mb-6">Select Channel</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => handleSelectChannel('whatsapp')}
              className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="font-semibold text-slate-900">WhatsApp</div>
              <div className="text-sm text-slate-600">Chat messaging</div>
            </button>
            <button
              onClick={() => handleSelectChannel('email')}
              className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="font-semibold text-slate-900">Email</div>
              <div className="text-sm text-slate-600">SMTP based</div>
            </button>
            <button
              onClick={() => handleSelectChannel('sms')}
              className="p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
            >
              <div className="font-semibold text-slate-900">SMS</div>
              <div className="text-sm text-slate-600">Text messages</div>
            </button>
          </div>
        </Card>
      )}

      {/* Provider Selection */}
      {step === 'provider' && selectedChannel && (
        <Card>
          <h2 className="text-lg font-semibold mb-6">Select Provider</h2>
          <div className="space-y-3">
            {getProvidersForChannel(selectedChannel).map((provider) => (
              <button
                key={provider.name}
                onClick={() => handleSelectProvider(provider.name as ProviderName)}
                className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="font-semibold text-slate-900">{provider.displayName}</div>
                <div className="text-sm text-slate-600">{provider.description}</div>
              </button>
            ))}
          </div>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            ← Back
          </button>
        </Card>
      )}

      {/* Credentials */}
      {step === 'credentials' && selectedChannel && selectedProvider && (
        <Card>
          <h2 className="text-lg font-semibold mb-6">Enter Credentials</h2>
          <form className="space-y-4">
            {PROVIDER_CONFIGS[selectedChannel]?.[selectedProvider]?.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm font-medium text-slate-700">
                  {field.label}
                  {field.required && <span className="text-red-600">*</span>}
                </label>
                <input
                  type={field.type}
                  value={credentials[field.name] || ''}
                  onChange={(e) => handleCredentialChange(field.name, e.target.value)}
                  placeholder={field.help}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
                {field.help && <p className="text-xs text-slate-500 mt-1">{field.help}</p>}
                {credentialErrors[field.name] && (
                  <p className="text-sm text-red-600 mt-1">{credentialErrors[field.name]}</p>
                )}
              </div>
            ))}
          </form>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                if (validateCredentials()) {
                  setStep('test')
                }
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Next: Test Connection
            </button>
            <button
              onClick={handleBack}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              ← Back
            </button>
          </div>
        </Card>
      )}

      {/* Test Connection */}
      {step === 'test' && (
        <Card>
          <h2 className="text-lg font-semibold mb-6">Test Connection</h2>
          {testMutation.isPending && <div className="text-slate-600">Testing connection...</div>}
          {testResult && (
            <div
              className={`p-4 rounded-lg ${
                testResult.status === 'healthy'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <div
                className={`font-semibold ${
                  testResult.status === 'healthy' ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {testResult.status === 'healthy' ? '✓ Connection Successful' : '✗ Connection Failed'}
              </div>
              <div
                className={`text-sm mt-1 ${
                  testResult.status === 'healthy' ? 'text-green-800' : 'text-red-800'
                }`}
              >
                {testResult.message}
              </div>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            {!testResult && (
              <button
                onClick={handleTestConnection}
                disabled={testMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {testMutation.isPending ? 'Testing...' : 'Test Connection'}
              </button>
            )}
            {testResult?.status === 'healthy' && (
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Next: Confirm
              </button>
            )}
            {testResult?.status === 'error' && (
              <button
                onClick={() => setStep('credentials')}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Credentials
              </button>
            )}
            <button
              onClick={handleBack}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              ← Back
            </button>
          </div>
        </Card>
      )}

      {/* Confirmation */}
      {step === 'confirm' && selectedChannel && selectedProvider && (
        <Card>
          <h2 className="text-lg font-semibold mb-6">Confirm & Save</h2>
          <div className="space-y-4 mb-6">
            <div>
              <div className="text-sm text-slate-600">Channel</div>
              <div className="font-semibold text-slate-900 capitalize">{selectedChannel}</div>
            </div>
            <div>
              <div className="text-sm text-slate-600">Provider</div>
              <div className="font-semibold text-slate-900">
                {PROVIDER_CONFIGS[selectedChannel]?.[selectedProvider]?.displayName}
              </div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-900">✓ Connection tested successfully</div>
            </div>
          </div>
          <button
            onClick={handleConfirm}
            disabled={connectMutation.isPending}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {connectMutation.isPending ? 'Saving...' : 'Save & Connect'}
          </button>
        </Card>
      )}
    </div>
  )
}
