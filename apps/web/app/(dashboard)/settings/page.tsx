'use client'

import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWorkspace, updateWorkspace } from '@bcp/sdk'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { useToast } from '@/lib/toast'
import { Card } from '@/components/ui/Card'

interface SettingsFormData {
  name: string
  timezone: string
  locale: string
}

export default function SettingsPage() {
  const { workspaceId } = useWorkspace()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceId ? getWorkspace(workspaceId) : Promise.reject(new Error('No workspace ID')),
    enabled: !!workspaceId,
  })

  const [formData, setFormData] = React.useState<SettingsFormData>(() => ({
    name: workspace?.name || '',
    timezone: workspace?.settings.timezone || 'UTC',
    locale: workspace?.settings.locale || 'en-US',
  }))

  const updateMutation = useMutation({
    mutationFn: async (data: SettingsFormData) => {
      if (!workspaceId) throw new Error('No workspace ID')
      return updateWorkspace(workspaceId, {
        name: data.name,
        settings: {
          timezone: data.timezone,
          locale: data.locale,
          maxContacts: workspace?.settings.maxContacts || 10000,
          maxCampaigns: workspace?.settings.maxCampaigns || 100,
        },
      })
    },
    onSuccess: () => {
      addToast('Settings saved successfully', 'success')
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
    },
    onError: () => {
      addToast('Failed to save settings', 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}

    if (!formData.name || formData.name.length < 3) {
      newErrors.name = 'Name must be at least 3 characters'
    }
    if (formData.name.length > 50) {
      newErrors.name = 'Name must be at most 50 characters'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setErrors({})
    updateMutation.mutate(formData)
  }

  if (isLoading) {
    return <div className="text-slate-600">Loading...</div>
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-1">Manage your workspace settings</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-6">Workspace Settings</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Workspace Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Your workspace name"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Timezone</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">America/New_York</option>
              <option value="America/Chicago">America/Chicago</option>
              <option value="America/Denver">America/Denver</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
              <option value="Europe/London">Europe/London</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Locale</label>
            <select
              value={formData.locale}
              onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="es-ES">Spanish</option>
              <option value="fr-FR">French</option>
              <option value="de-DE">German</option>
              <option value="pt-BR">Portuguese (Brazil)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Workspace Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-slate-600">Workspace ID</div>
            <div className="text-sm font-mono text-slate-900">{workspace?.id}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Max Contacts</div>
            <div className="text-sm text-slate-900">{workspace?.settings.maxContacts}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Max Campaigns</div>
            <div className="text-sm text-slate-900">{workspace?.settings.maxCampaigns}</div>
          </div>
          <div>
            <div className="text-sm text-slate-600">Status</div>
            <div className="text-sm text-slate-900">{workspace?.status}</div>
          </div>
        </div>
      </Card>
    </div>
  )
}
